# ruff: noqa: E501
import logging
import math
from dataclasses import asdict, replace
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from src.api.schemas.calculation import TransponderType
from src.core.elevation import compute_elevation
from src.core.impairments import (
    apply_impairments,
    combine_cn_db,
    compute_interference,
    estimate_intermodulation,
)
from src.core.models.common import CalculationResult, LinkDirectionParameters, RuntimeParameters
from src.core.orbit import propagate_tle
from src.core.strategies.communication import CommunicationContext, TransparentCommunicationStrategy
from src.core.strategies.dvbs2x import DvbS2xStrategy, ModcodEntry, _clean_modcod_dict
from src.core.strategies.nr import NrStrategy
from src.persistence.repositories.assets import EarthStationRepository, SatelliteRepository
from src.persistence.repositories.modcod import ModcodRepository
from src.services.snapshot_builder import build_payload_snapshot, build_runtime_echo

logger = logging.getLogger(__name__)


def _selected_modcod_entry_from_table(
    modcod_id: str | None,
    table_source: Any,
    waveform_source: Any,
    rolloff_value: float | None,
) -> dict[str, Any] | None:
    """Look up a ModCod entry by ID and enrich with spectral efficiency."""
    if modcod_id is None:
        return None
    table_entries = None
    if table_source:
        table_entries = table_source.entries
    elif getattr(waveform_source, "table", None):
        table_entries = waveform_source.table
    if not table_entries:
        return None
    for entry in table_entries:
        source = entry if isinstance(entry, dict) else asdict(entry)
        if source.get("id") == modcod_id:
            cleaned = source if not isinstance(source, dict) else _clean_modcod_dict(source)
            entry_obj = entry if isinstance(entry, ModcodEntry) else ModcodEntry(**cleaned)
            effective_se = None
            if hasattr(waveform_source, "effective_spectral_efficiency"):
                try:
                    effective_se = waveform_source.effective_spectral_efficiency(
                        entry_obj, rolloff_value
                    )  # type: ignore[arg-type]
                except Exception:
                    effective_se = None
            return {
                "id": source.get("id"),
                "modulation": source.get("modulation"),
                "code_rate": source.get("code_rate"),
                "required_ebno_db": source.get("required_ebno_db"),
                "required_cn0_dbhz": source.get("required_cn0_dbhz"),
                "info_bits_per_symbol": source.get("info_bits_per_symbol"),
                "effective_spectral_efficiency": effective_se,
                "rolloff": source.get("rolloff"),
                "pilots": source.get("pilots"),
            }
    return None


class CalculationService:
    def __init__(
        self,
        communication_strategy: TransparentCommunicationStrategy | None = None,
        modcod_repo: ModcodRepository | None = None,
        satellite_repo: SatelliteRepository | None = None,
        earth_station_repo: EarthStationRepository | None = None,
    ):
        context = CommunicationContext()
        self.communication_strategy = communication_strategy or TransparentCommunicationStrategy(
            waveform=DvbS2xStrategy(),
            context=context,
        )
        self.modcod_repo = modcod_repo
        self.satellite_repo = satellite_repo
        self.earth_station_repo = earth_station_repo

    @staticmethod
    def _create_waveform_strategy(waveform_name: str | None, entries):
        """Create the appropriate waveform strategy based on waveform type."""
        if waveform_name == "5G_NR":
            return NrStrategy(table=entries)
        return DvbS2xStrategy(table=entries)

    async def _fetch_modcod(self, modcod_table_id: UUID | str | None):
        if self.modcod_repo and modcod_table_id:
            try:
                table = await self.modcod_repo.get(modcod_table_id)
            except Exception as exc:
                logger.exception("Failed to fetch ModCod table %s", modcod_table_id)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Failed to fetch ModCod table from database",
                ) from exc
            if table:
                try:
                    waveform_name = getattr(table, "waveform", None)
                    waveform = self._create_waveform_strategy(waveform_name, table.entries)
                except ValueError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ModCod table entries are invalid: {exc}",
                    ) from exc
                return table, waveform
        return None, None

    async def _fetch_assets(self, payload: dict[str, Any]):
        """Fetch satellite and earth station assets from repositories (no validation)."""
        tx_es = rx_es = sat = None
        tx_id = payload.get("earth_station_tx_id")
        rx_id = payload.get("earth_station_rx_id")
        sat_id = payload.get("satellite_id")
        if self.earth_station_repo:
            if tx_id:
                tx_es = await self.earth_station_repo.get(tx_id)
            if rx_id:
                rx_es = await self.earth_station_repo.get(rx_id)
        if self.satellite_repo and sat_id:
            sat = await self.satellite_repo.get(sat_id)
        return sat, tx_es, rx_es

    @staticmethod
    def _resolve_satellite_geometry(
        sat: Any,
        runtime_data: dict[str, Any],
    ) -> tuple[float, float, float]:
        """Resolve satellite position (longitude, latitude, altitude) from orbit type.

        Returns (sat_longitude, sat_latitude, sat_altitude_km).
        For TLE satellites, also resolves via orbit propagation.
        """
        orbit_type = getattr(sat, "orbit_type", "GEO") or "GEO"

        # 1. TLE propagation (LEO/HAPS with TLE data)
        tle_line1 = getattr(sat, "tle_line1", None)
        tle_line2 = getattr(sat, "tle_line2", None)
        if orbit_type in ("LEO", "HAPS") and tle_line1 and tle_line2:
            comp_time_str = runtime_data.get("computation_datetime")
            comp_time = None
            if comp_time_str:
                from datetime import UTC, datetime

                if isinstance(comp_time_str, str):
                    comp_time = datetime.fromisoformat(comp_time_str)
                    if comp_time.tzinfo is None:
                        comp_time = comp_time.replace(tzinfo=UTC)
                elif isinstance(comp_time_str, datetime):
                    comp_time = comp_time_str
            try:
                pos = propagate_tle(tle_line1, tle_line2, getattr(sat, "name", "SAT"), comp_time)
            except (ValueError, RuntimeError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"TLE propagation failed: {exc}",
                ) from exc
            return pos.longitude_deg, pos.latitude_deg, pos.altitude_km

        # 2. Manual position
        sat_lon = runtime_data.get("sat_longitude_deg") or getattr(sat, "longitude_deg", None)
        if sat_lon is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Satellite longitude is required (use satellite asset longitude or provide sat_longitude_deg)",
            )

        if orbit_type == "GEO":
            sat_lat = 0.0
            sat_alt = (
                runtime_data.get("sat_altitude_km") or getattr(sat, "altitude_km", None) or 35786.0
            )
        else:
            sat_lat = runtime_data.get("sat_latitude_deg")
            if sat_lat is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Satellite latitude (sat_latitude_deg) is required for LEO/HAPS orbits without TLE",
                )
            sat_alt = runtime_data.get("sat_altitude_km") or getattr(sat, "altitude_km", None)
            if sat_alt is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Satellite altitude (sat_altitude_km or asset altitude_km) is required for LEO/HAPS orbits",
                )

        return sat_lon, sat_lat, sat_alt

    @staticmethod
    def _build_direction(
        primary: dict[str, Any],
        direction: str,
        sat_longitude: float,
        sat_latitude: float = 0.0,
        sat_altitude_km: float = 35786.0,
    ) -> LinkDirectionParameters:
        """Build LinkDirectionParameters from raw direction data."""
        freq = primary.get("frequency_hz")
        bw = primary.get("bandwidth_hz")
        rain = primary.get("rain_rate_mm_per_hr", 0)
        temp_default = 290 if direction == "uplink" else 120
        temp = primary.get("temperature_k") or temp_default
        pressure = primary.get("pressure_hpa")
        vapor = primary.get("water_vapor_density")
        station_lat = primary.get("ground_lat_deg")
        station_lon = primary.get("ground_lon_deg")
        station_alt = primary.get("ground_alt_m", 0) or 0
        if None in (freq, bw, station_lat, station_lon):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="frequency_hz, bandwidth_hz, and ground coordinates are required in runtime",
            )
        elev = primary.get("elevation_deg")
        if elev is None:
            elev = compute_elevation(
                sat_latitude,
                sat_longitude,
                sat_altitude_km,
                station_lat,
                station_lon,
                station_alt or 0,
            )
        if elev < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Computed elevation for {direction} is below horizon ({elev:.2f} deg); check ground coordinates and satellite position",
            )
        return LinkDirectionParameters(
            frequency_hz=freq,
            bandwidth_hz=bw,
            elevation_deg=elev,
            rain_rate_mm_per_hr=rain,
            temperature_k=temp,
            ground_lat_deg=station_lat,
            ground_lon_deg=station_lon,
            ground_alt_m=station_alt or 0,
            pressure_hpa=pressure,
            water_vapor_density=vapor,
        )

    @staticmethod
    def _resolve_context(
        sat: Any,
        tx_es: Any,
        rx_es: Any,
        sat_override: dict[str, Any],
    ) -> CommunicationContext:
        """Resolve EIRP and G/T from assets and overrides into a context."""

        def _value_with_override(override: dict[str, Any], station: Any, key: str):
            if override.get(key) is not None:
                return override[key]
            if station is None:
                return None
            return getattr(station, key, None)

        context = CommunicationContext()

        # TX EIRP fallback chain: eirp_dbw > tx_power_dbw + antenna_gain_tx_db > tx_power_dbw
        tx_eirp = getattr(tx_es, "eirp_dbw", None)
        tx_gain = getattr(tx_es, "antenna_gain_tx_db", None)
        tx_power = getattr(tx_es, "tx_power_dbw", None)
        if tx_eirp is None and tx_power is not None and tx_gain is not None:
            tx_eirp = tx_power + tx_gain
        elif tx_eirp is None and tx_power is not None:
            tx_eirp = tx_power
        if tx_eirp is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TX earth station EIRP is required (provide eirp_dbw or tx_power_dbw/antenna_gain_tx_db via asset or override)",
            )
        context.uplink_tx_eirp_dbw = tx_eirp

        sat_gt = _value_with_override(sat_override, sat, "gt_db_per_k")
        if sat_gt is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Satellite G/T is required (asset or override)",
            )
        context.uplink_rx_gt_db_per_k = sat_gt

        # RX G/T fallback: gt_db_per_k > antenna_gain_rx_db - 10*log10(noise_temperature_k)
        rx_gt = getattr(rx_es, "gt_db_per_k", None)
        if rx_gt is None:
            rx_gain = getattr(rx_es, "antenna_gain_rx_db", None)
            rx_temp = getattr(rx_es, "noise_temperature_k", None)
            if rx_gain is not None and rx_temp is not None and rx_temp > 0:
                rx_gt = rx_gain - 10 * math.log10(rx_temp)
        if rx_gt is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RX earth station G/T is required (asset or override, or provide Gain/NoiseTemp)",
            )
        context.downlink_rx_gt_db_per_k = rx_gt

        sat_eirp = _value_with_override(sat_override, sat, "eirp_dbw")
        if sat_eirp is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Satellite EIRP is required (asset or override)",
            )
        context.downlink_tx_eirp_dbw = sat_eirp

        return context

    async def calculate(self, payload: dict[str, Any]) -> dict[str, Any]:  # noqa: C901
        include_snapshot = bool(payload.get("include_snapshot"))
        tx_id = payload.get("earth_station_tx_id")
        rx_id = payload.get("earth_station_rx_id")
        sat_id = payload.get("satellite_id")
        overrides_block = payload.get("overrides") or {}

        def _as_dict(source: Any) -> dict[str, Any]:
            if hasattr(source, "model_dump"):
                return source.model_dump()
            return source or {}

        sat_override = _as_dict(overrides_block.get("satellite"))
        clean_overrides = sat_override or None

        sat, tx_es, rx_es = await self._fetch_assets(payload)

        transponder_value = payload.get("transponder_type", TransponderType.TRANSPARENT.value)
        transponder_type = (
            transponder_value
            if isinstance(transponder_value, TransponderType)
            else TransponderType(transponder_value)
        )
        runtime_data = payload.get("runtime", {})
        rolloff = runtime_data.get("rolloff")

        # ---- Resolve ModCod tables ----
        common_modcod_table, common_waveform = await self._fetch_modcod(
            payload.get("modcod_table_id")
        )
        if (
            transponder_type == TransponderType.TRANSPARENT
            and payload.get("modcod_table_id") is None
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="modcod_table_id is required for Transparent transponders",
            )

        uplink_modcod_table = downlink_modcod_table = None
        uplink_waveform = downlink_waveform = None
        if transponder_type == TransponderType.TRANSPARENT:
            if payload.get("modcod_table_id") and not common_modcod_table:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="ModCod table not found"
                )
            if common_waveform:
                self.communication_strategy.waveform = common_waveform
            uplink_modcod_table = downlink_modcod_table = common_modcod_table
            uplink_waveform = downlink_waveform = self.communication_strategy.waveform
        else:
            uplink_table_id = payload.get("uplink_modcod_table_id")
            downlink_table_id = payload.get("downlink_modcod_table_id")
            uplink_modcod_table, uplink_waveform = await self._fetch_modcod(uplink_table_id)
            downlink_modcod_table, downlink_waveform = await self._fetch_modcod(downlink_table_id)
            if uplink_table_id and not uplink_modcod_table:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Uplink ModCod table not found"
                )
            if downlink_table_id and not downlink_modcod_table:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Downlink ModCod table not found"
                )
            uplink_waveform = uplink_waveform or DvbS2xStrategy()
            downlink_waveform = downlink_waveform or DvbS2xStrategy()

        # ---- Validate asset availability ----
        if sat_id and not sat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found")
        if tx_id and not tx_es:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Earth station (tx) not found"
            )
        if rx_id and not rx_es:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Earth station (rx) not found"
            )

        # ---- Resolve bandwidth ----
        uplink_data = runtime_data.get("uplink") or {}
        downlink_data = runtime_data.get("downlink") or {}
        shared_bandwidth = runtime_data.get("bandwidth_hz")
        if transponder_type == TransponderType.TRANSPARENT:
            shared_bandwidth = (
                shared_bandwidth
                or uplink_data.get("bandwidth_hz")
                or downlink_data.get("bandwidth_hz")
            )
            if shared_bandwidth is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="bandwidth_hz is required for Transparent transponders",
                )
            for direction_data in (uplink_data, downlink_data):
                if (
                    direction_data.get("bandwidth_hz")
                    and direction_data.get("bandwidth_hz") != shared_bandwidth
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Transparent transponders use a common bandwidth_hz for uplink and downlink",
                    )
                direction_data["bandwidth_hz"] = shared_bandwidth
        elif shared_bandwidth is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Regenerative transponders require per-link bandwidth_hz values",
            )

        sat_longitude, sat_latitude, sat_altitude_km = self._resolve_satellite_geometry(
            sat, runtime_data
        )

        # ---- Build link parameters ----
        uplink_params = self._build_direction(
            uplink_data, "uplink", sat_longitude, sat_latitude, sat_altitude_km
        )
        downlink_params = self._build_direction(
            downlink_data, "downlink", sat_longitude, sat_latitude, sat_altitude_km
        )

        context = self._resolve_context(sat, tx_es, rx_es, sat_override)
        self.communication_strategy.context = context

        runtime = RuntimeParameters(
            sat_longitude_deg=sat_longitude,
            uplink=uplink_params,
            downlink=downlink_params,
            rolloff=rolloff,
            sat_latitude_deg=sat_latitude,
            sat_altitude_km=sat_altitude_km,
        )

        # ---- Core calculation ----
        try:
            uplink = await self.communication_strategy.calculate(runtime, direction="uplink")
            downlink = await self.communication_strategy.calculate(runtime, direction="downlink")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        ul_clean_cn = uplink.cn_db
        dl_clean_cn = downlink.cn_db
        uplink_bandwidth = (
            uplink.bandwidth_hz or uplink_data.get("bandwidth_hz") or shared_bandwidth
        )
        downlink_bandwidth = (
            downlink.bandwidth_hz or downlink_data.get("bandwidth_hz") or shared_bandwidth
        )

        # ---- Apply impairments ----
        uplink_i_over_c, uplink_ci_db, uplink_interference_applied = compute_interference(
            uplink_data.get("interference")
        )
        downlink_i_over_c, downlink_ci_db, downlink_interference_applied = compute_interference(
            downlink_data.get("interference")
        )
        intermod_block = runtime_data.get("intermodulation") or {}
        c_im_db, intermod_applied = estimate_intermodulation(intermod_block)

        uplink = apply_impairments(
            uplink,
            uplink_bandwidth,
            uplink_i_over_c,
            uplink_ci_db,
            uplink_interference_applied,
            False,
            c_im_db,
        )
        downlink = apply_impairments(
            downlink,
            downlink_bandwidth,
            downlink_i_over_c,
            downlink_ci_db,
            downlink_interference_applied,
            intermod_applied,
            c_im_db,
        )
        uplink = replace(uplink, clean_cn_db=ul_clean_cn)
        downlink = replace(downlink, clean_cn_db=dl_clean_cn)

        # ---- Build runtime echo ----
        is_transparent = transponder_type == TransponderType.TRANSPARENT
        runtime_echo = build_runtime_echo(
            runtime,
            rolloff,
            uplink_data,
            downlink_data,
            intermod_block,
            shared_bandwidth,
            is_transparent,
        )

        # ---- Combine results and select ModCod ----
        (
            combined_results,
            modcod_selection_payload,
            combined_cn_db_val,
            combined_cn0_dbhz,
            total_link_margin,
        ) = self._combine_and_select_modcod(
            transponder_type,
            uplink,
            downlink,
            ul_clean_cn,
            dl_clean_cn,
            rolloff,
            shared_bandwidth,
            common_modcod_table,
            uplink_modcod_table,
            downlink_modcod_table,
            uplink_waveform,
            downlink_waveform,
        )

        # Re-read uplink/downlink since _combine_and_select_modcod returns updated values via closure
        # Instead, pass them through the method
        results = {
            "uplink": asdict(uplink),
            "downlink": asdict(downlink),
            "combined": combined_results,
        }

        # ---- Snapshot (optional) ----
        payload_snapshot = None
        if include_snapshot:
            payload_snapshot = build_payload_snapshot(
                payload,
                runtime,
                runtime_echo,
                sat,
                tx_es,
                rx_es,
                common_modcod_table,
                uplink_modcod_table,
                downlink_modcod_table,
                self.communication_strategy.waveform,
                sat_id,
                tx_id,
                rx_id,
                clean_overrides,
            )
            payload_snapshot["runtime"] = runtime_echo

        return {
            "schema_version": "1.1.0",
            "strategy": {
                "waveform_strategy": payload.get("waveform_strategy"),
                "transponder_type": payload.get("transponder_type"),
            },
            "results": results,
            "combined_link_margin_db": total_link_margin,
            "combined_cn_db": combined_cn_db_val,
            "combined_cn0_dbhz": combined_cn0_dbhz,
            "modcod_selected": modcod_selection_payload,
            "runtime_echo": runtime_echo,
            "payload_snapshot": payload_snapshot,
        }

    def _combine_and_select_modcod(
        self,
        transponder_type: TransponderType,
        uplink: CalculationResult,
        downlink: CalculationResult,
        ul_clean_cn: float,
        dl_clean_cn: float,
        rolloff: float | None,
        shared_bandwidth: float | None,
        common_modcod_table: Any,
        uplink_modcod_table: Any,
        downlink_modcod_table: Any,
        uplink_waveform: Any,
        downlink_waveform: Any,
    ) -> tuple[
        dict[str, Any] | None, dict[str, Any] | None, float | None, float | None, float | None
    ]:
        """Combine uplink/downlink and select ModCod entries.

        Returns (combined_results, modcod_selection_payload, combined_cn_db, combined_cn0_dbhz, total_link_margin).
        """
        if transponder_type == TransponderType.TRANSPARENT:
            return self._transparent_combine(
                uplink,
                downlink,
                ul_clean_cn,
                dl_clean_cn,
                rolloff,
                common_modcod_table,
            )
        return self._regenerative_combine(
            uplink,
            downlink,
            ul_clean_cn,
            dl_clean_cn,
            rolloff,
            common_modcod_table,
            uplink_modcod_table,
            downlink_modcod_table,
            uplink_waveform,
            downlink_waveform,
        )

    def _transparent_combine(
        self,
        uplink: CalculationResult,
        downlink: CalculationResult,
        ul_clean_cn: float,
        dl_clean_cn: float,
        rolloff: float | None,
        common_modcod_table: Any,
    ) -> tuple[
        dict[str, Any] | None, dict[str, Any] | None, float | None, float | None, float | None
    ]:
        combined_bandwidth = downlink.bandwidth_hz or uplink.bandwidth_hz
        combined_cn = combine_cn_db(uplink.cn_db, downlink.cn_db)
        combined_cn0 = combined_cn + 10 * math.log10(combined_bandwidth)
        combined_cni = combine_cn_db(
            uplink.cni_db if uplink.cni_db is not None else uplink.cn_db,
            downlink.cni_db if downlink.cni_db is not None else downlink.cn_db,
        )
        combined_cni0 = combined_cni + 10 * math.log10(combined_bandwidth)

        (
            selected_entry,
            _available_ebno,
            required_ebno,
            margin,
            bitrate_used,
        ) = self.communication_strategy.waveform.select_modcod_with_margin(  # type: ignore[arg-type]
            combined_cn0,
            combined_bandwidth,
            rolloff,
        )
        selected_modcod = selected_entry.id if selected_entry else None
        total_link_margin = margin

        if selected_modcod:
            uplink = replace(uplink, modcod_selected=selected_modcod)
            downlink = replace(downlink, modcod_selected=selected_modcod)
        if required_ebno is not None and bitrate_used:

            def _link_margin(cn0_dbhz: float) -> float:
                return cn0_dbhz - 10 * math.log10(bitrate_used) - required_ebno

            uplink = replace(uplink, link_margin_db=_link_margin(uplink.cn0_dbhz))
            downlink = replace(downlink, link_margin_db=_link_margin(downlink.cn0_dbhz))
        elif margin is not None:
            uplink = replace(uplink, link_margin_db=margin)
            downlink = replace(downlink, link_margin_db=margin)

        combined_results: dict[str, Any] = {
            "cn_db": combined_cn,
            "cn0_dbhz": combined_cn0,
            "cni_db": combined_cni,
            "cni0_dbhz": combined_cni0,
            "c_im_db": downlink.c_im_db,
            "link_margin_db": total_link_margin,
        }
        if total_link_margin is not None:
            combined_clean_cn = combine_cn_db(ul_clean_cn, dl_clean_cn)
            combined_results["clean_link_margin_db"] = total_link_margin + (
                combined_clean_cn - combined_cn
            )
            combined_results["clean_cn_db"] = combined_clean_cn

        modcod_selection_payload = None
        if selected_modcod:
            modcod_selection_payload = _selected_modcod_entry_from_table(
                selected_modcod,
                common_modcod_table,
                self.communication_strategy.waveform,
                rolloff,
            )
            if not modcod_selection_payload:
                modcod_selection_payload = {"id": selected_modcod}

        return (
            combined_results,
            modcod_selection_payload,
            combined_cn,
            combined_cn0,
            total_link_margin,
        )

    @staticmethod
    def _regenerative_combine(
        uplink: CalculationResult,
        downlink: CalculationResult,
        ul_clean_cn: float,
        dl_clean_cn: float,
        rolloff: float | None,
        common_modcod_table: Any,
        uplink_modcod_table: Any,
        downlink_modcod_table: Any,
        uplink_waveform: Any,
        downlink_waveform: Any,
    ) -> tuple[None, dict[str, Any] | None, None, None, float | None]:
        def _apply_modcod(
            result: CalculationResult,
            waveform: Any,
        ) -> CalculationResult:
            entry, _available_ebno, required_ebno, margin, bitrate_used = (
                waveform.select_modcod_with_margin(
                    result.cn0_dbhz,
                    result.bandwidth_hz,
                    rolloff,
                )
            )
            updates: dict[str, Any] = {}
            if entry:
                updates["modcod_selected"] = entry.id
            if required_ebno is not None and bitrate_used:
                available_link_ebno = result.cn0_dbhz - 10 * math.log10(bitrate_used)
                updates["link_margin_db"] = available_link_ebno - required_ebno
            elif margin is not None:
                updates["link_margin_db"] = margin
            return replace(result, **updates) if updates else result

        uplink = _apply_modcod(uplink, uplink_waveform)
        downlink = _apply_modcod(downlink, downlink_waveform)
        if uplink.link_margin_db is not None:
            uplink = replace(
                uplink,
                clean_link_margin_db=uplink.link_margin_db + (ul_clean_cn - uplink.cn_db),
                clean_cn_db=ul_clean_cn,
            )
        if downlink.link_margin_db is not None:
            downlink = replace(
                downlink,
                clean_link_margin_db=downlink.link_margin_db + (dl_clean_cn - downlink.cn_db),
                clean_cn_db=dl_clean_cn,
            )
        link_margins = [
            m for m in (uplink.link_margin_db, downlink.link_margin_db) if m is not None
        ]
        total_link_margin = min(link_margins) if link_margins else None
        modcod_selection_payload = {
            "uplink": _selected_modcod_entry_from_table(
                uplink.modcod_selected,
                uplink_modcod_table,
                uplink_waveform,
                rolloff,
            )
            or ({"id": uplink.modcod_selected} if uplink.modcod_selected else None),
            "downlink": _selected_modcod_entry_from_table(
                downlink.modcod_selected,
                downlink_modcod_table,
                downlink_waveform,
                rolloff,
            )
            or ({"id": downlink.modcod_selected} if downlink.modcod_selected else None),
        }
        return None, modcod_selection_payload, None, None, total_link_margin
