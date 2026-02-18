# ruff: noqa: E501,I001
import logging
import math
from dataclasses import asdict, replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from src.api.schemas.calculation import TransponderType
from src.core.models.common import CalculationResult, LinkDirectionParameters, RuntimeParameters
from src.core.strategies.communication import CommunicationContext, TransparentCommunicationStrategy
from src.core.strategies.dvbs2x import DvbS2xStrategy, ModcodEntry, _clean_modcod_dict
from src.persistence.repositories.assets import EarthStationRepository, SatelliteRepository
from src.persistence.repositories.modcod import ModcodRepository

logger = logging.getLogger(__name__)


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
                    waveform = DvbS2xStrategy(table=table.entries)
                except ValueError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ModCod table entries are invalid: {exc}",
                    ) from exc
                return table, waveform
        return None, None

    async def calculate(self, payload: dict[str, Any]) -> dict[str, Any]:
        tx_es = None
        rx_es = None
        sat = None
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
        if self.earth_station_repo:
            if tx_id:
                tx_es = await self.earth_station_repo.get(tx_id)
            if rx_id:
                rx_es = await self.earth_station_repo.get(rx_id)
        if self.satellite_repo and sat_id:
            sat = await self.satellite_repo.get(sat_id)

        transponder_value = payload.get("transponder_type", TransponderType.TRANSPARENT.value)
        transponder_type = (
            transponder_value
            if isinstance(transponder_value, TransponderType)
            else TransponderType(transponder_value)
        )
        runtime_data = payload.get("runtime", {})
        rolloff = runtime_data.get("rolloff")
        common_modcod_table, common_waveform = await self._fetch_modcod(payload.get("modcod_table_id"))
        if transponder_type == TransponderType.TRANSPARENT and payload.get("modcod_table_id") is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="modcod_table_id is required for Transparent transponders")

        uplink_modcod_table = downlink_modcod_table = None
        uplink_waveform = downlink_waveform = None
        if transponder_type == TransponderType.TRANSPARENT:
            if payload.get("modcod_table_id") and not common_modcod_table:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ModCod table not found")
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
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uplink ModCod table not found")
            if downlink_table_id and not downlink_modcod_table:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Downlink ModCod table not found")
            uplink_waveform = uplink_waveform or DvbS2xStrategy()
            downlink_waveform = downlink_waveform or DvbS2xStrategy()

        if sat_id and not sat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Satellite not found")
        if tx_id and not tx_es:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Earth station (tx) not found")
        if rx_id and not rx_es:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Earth station (rx) not found")

        def _direction_data(key: str) -> dict[str, Any]:
            return runtime_data.get(key) or {}

        uplink_data = _direction_data("uplink")
        downlink_data = _direction_data("downlink")
        shared_bandwidth = runtime_data.get("bandwidth_hz")
        if transponder_type == TransponderType.TRANSPARENT:
            shared_bandwidth = shared_bandwidth or uplink_data.get("bandwidth_hz") or downlink_data.get("bandwidth_hz")
            if shared_bandwidth is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bandwidth_hz is required for Transparent transponders")
            for direction_data in (uplink_data, downlink_data):
                if direction_data.get("bandwidth_hz") and direction_data.get("bandwidth_hz") != shared_bandwidth:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Transparent transponders use a common bandwidth_hz for uplink and downlink",
                    )
                direction_data["bandwidth_hz"] = shared_bandwidth
        elif shared_bandwidth is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Regenerative transponders require per-link bandwidth_hz values")

        sat_longitude = runtime_data.get("sat_longitude_deg") or getattr(sat, "longitude_deg", None)
        if sat_longitude is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Satellite longitude is required (use satellite asset longitude or provide sat_longitude_deg)")

        def _interference_inputs(direction_data: dict[str, Any]) -> tuple[float, float | None, bool]:
            block = direction_data.get("interference") or {}
            ci_values = [
                block.get("adjacent_sat_ci_db"),
                block.get("cross_polar_ci_db"),
                block.get("other_carrier_ci_db"),
            ]
            inv_terms = []
            for value in ci_values:
                if value is None:
                    continue
                ci_lin = 10 ** (value / 10)
                if ci_lin <= 0:
                    continue
                inv_terms.append(1 / ci_lin)
            i_over_c = sum(inv_terms)
            aggregate_ci_db = None
            if i_over_c > 0:
                aggregate_ci_db = 10 * math.log10(1 / i_over_c)
            applied = bool(block.get("applied")) or any(v is not None for v in ci_values)
            return i_over_c, aggregate_ci_db, applied

        def _estimate_c_im(intermod_block: dict[str, Any] | None) -> tuple[float | None, bool]:
            """Simple IMD estimate: use output/input backoff and carrier count."""
            if not intermod_block:
                return None, False
            carriers = intermod_block.get("composite_carriers")
            o_bo = intermod_block.get("output_backoff_db")
            i_bo = intermod_block.get("input_backoff_db")
            backoff = o_bo if o_bo is not None else i_bo
            if backoff is None or carriers is None or carriers < 1:
                return None, False
            # Approximate C/IM improvement with backoff; subtract carrier aggregation impact.
            c_im_db = max(0.0, 2 * backoff + 7 - 10 * math.log10(carriers))
            return c_im_db, True

        def _compute_elevation(sat_lon_deg: float, ground_lat_deg: float, ground_lon_deg: float, ground_alt_m: float) -> float:
            """
            GEO elevation (deg) using standard spherical approximation:
            psi = central angle between ground and subsatellite point
            elev = atan( (cos(psi) - Re/Rs) / sin(psi) )
            """
            re_km = 6378.0 + (ground_alt_m / 1000.0)
            rs_km = 42164.0
            lat_rad = math.radians(ground_lat_deg)
            delta_lon_rad = math.radians(sat_lon_deg - ground_lon_deg)
            cos_psi = math.cos(lat_rad) * math.cos(delta_lon_rad)
            cos_psi = max(-1.0, min(1.0, cos_psi))
            psi = math.acos(cos_psi)
            sin_psi = math.sin(psi)
            if sin_psi == 0:
                return 90.0
            elev_rad = math.atan((math.cos(psi) - (re_km / rs_km)) / sin_psi)
            return math.degrees(elev_rad)

        def _build_direction(primary: dict[str, Any], direction: str) -> LinkDirectionParameters:
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
                elev = _compute_elevation(sat_longitude, station_lat, station_lon, station_alt or 0)
            if elev < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Computed elevation for {direction} is below horizon ({elev:.2f} deg); check ground coordinates and satellite longitude",
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

        uplink_params = _build_direction(uplink_data, "uplink")
        downlink_params = _build_direction(downlink_data, "downlink")

        def _value_with_override(override: dict[str, Any], station, key: str):
            if override.get(key) is not None:
                return override[key]
            if station is None:
                return None
            return getattr(station, key, None)

        # Apply asset-based performance with runtime overrides
        context = CommunicationContext()
        self.communication_strategy.context = context

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

        runtime = RuntimeParameters(
            sat_longitude_deg=sat_longitude,
            uplink=uplink_params,
            downlink=downlink_params,
            rolloff=rolloff,
        )
        try:
            uplink = await self.communication_strategy.calculate(runtime, direction="uplink")
            downlink = await self.communication_strategy.calculate(runtime, direction="downlink")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        ul_clean_cn = uplink.cn_db
        dl_clean_cn = downlink.cn_db
        uplink_bandwidth = uplink.bandwidth_hz or uplink_data.get("bandwidth_hz") or shared_bandwidth
        downlink_bandwidth = downlink.bandwidth_hz or downlink_data.get("bandwidth_hz") or shared_bandwidth
        uplink_i_over_c, uplink_ci_db, uplink_interference_applied = _interference_inputs(uplink_data)
        downlink_i_over_c, downlink_ci_db, downlink_interference_applied = _interference_inputs(downlink_data)
        intermod_block = runtime_data.get("intermodulation") or {}
        c_im_db, intermod_applied = _estimate_c_im(intermod_block)

        def _apply_impairments(
            result: CalculationResult,
            bandwidth_hz: float | None,
            i_over_c: float,
            aggregate_ci_db: float | None,
            interference_flag: bool,
            apply_intermod: bool,
            c_im_db_value: float | None,
        ) -> CalculationResult:
            if bandwidth_hz:
                base_cn0 = result.cn0_dbhz
                base_cn = result.cn_db
                cn_lin = 10 ** (base_cn / 10)
                thermal_term = 1 / cn_lin
                interference_term = i_over_c if i_over_c > 0 else 0.0

                updates: dict[str, Any] = {}

                if interference_term > 0:
                    cni_lin = 1 / (thermal_term + interference_term)
                    updates["cni_db"] = 10 * math.log10(cni_lin)
                    updates["cni0_dbhz"] = updates["cni_db"] + 10 * math.log10(bandwidth_hz)
                else:
                    updates["cni_db"] = base_cn
                    updates["cni0_dbhz"] = base_cn0

                intermod_term = 0.0
                if apply_intermod and c_im_db_value:
                    cim_lin = 10 ** (c_im_db_value / 10)
                    if cim_lin > 0:
                        intermod_term = 1 / cim_lin
                        updates["c_im_db"] = c_im_db_value
                        updates["intermod_applied"] = True

                total_term = thermal_term + interference_term + intermod_term
                if total_term > 0:
                    cn_lin_effective = 1 / total_term
                    cn_db_effective = 10 * math.log10(cn_lin_effective)
                    cn0_effective = cn_db_effective + 10 * math.log10(bandwidth_hz)
                    updates["cn_db"] = cn_db_effective
                    updates["cn0_dbhz"] = cn0_effective
                    delta = cn_db_effective - base_cn
                    if result.link_margin_db is not None:
                        updates["link_margin_db"] = result.link_margin_db + delta

                updates["interference_applied"] = interference_flag or interference_term > 0
                warnings = list(result.warnings or [])
                cni_db_val = updates.get("cni_db", result.cni_db)
                cn_db_val = updates.get("cn_db", result.cn_db)
                intermod_flag = updates.get("intermod_applied", result.intermod_applied)
                c_im_val = updates.get("c_im_db", result.c_im_db)
                if updates["interference_applied"] and aggregate_ci_db is not None and cni_db_val is not None:
                    warnings.append(
                        f"Interference applied: aggregate C/I={aggregate_ci_db:.2f} dB, C/(N+I) degraded by {base_cn - cni_db_val:.2f} dB",
                    )
                if intermod_flag and c_im_val is not None and cn_db_val is not None:
                    warnings.append(
                        f"Intermodulation applied: C/IM={c_im_val:.2f} dB, total C/N degraded by {base_cn - cn_db_val:.2f} dB",
                    )
                updates["warnings"] = warnings
                return replace(result, **updates)
            return result

        uplink = _apply_impairments(
            uplink,
            uplink_bandwidth,
            uplink_i_over_c,
            uplink_ci_db,
            uplink_interference_applied,
            False,
            c_im_db,
        )
        downlink = _apply_impairments(
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

        def _runtime_direction_echo(params: LinkDirectionParameters, interference_block: dict[str, Any]) -> dict[str, Any]:
            return {
                "frequency_hz": params.frequency_hz,
                "bandwidth_hz": params.bandwidth_hz,
                "elevation_deg": params.elevation_deg,
                "rain_rate_mm_per_hr": params.rain_rate_mm_per_hr,
                "temperature_k": params.temperature_k,
                "pressure_hpa": params.pressure_hpa,
                "water_vapor_density": params.water_vapor_density,
                "ground_lat_deg": params.ground_lat_deg,
                "ground_lon_deg": params.ground_lon_deg,
                "ground_alt_m": params.ground_alt_m,
                "interference": interference_block or None,
            }

        runtime_echo = {
            "sat_longitude_deg": runtime.sat_longitude_deg,
            "rolloff": rolloff,
            "uplink": _runtime_direction_echo(runtime.uplink, uplink_data.get("interference") or {}),
            "downlink": _runtime_direction_echo(runtime.downlink, downlink_data.get("interference") or {}),
            "intermodulation": intermod_block or None,
        }
        if shared_bandwidth is not None and transponder_type == TransponderType.TRANSPARENT:
            runtime_echo["bandwidth_hz"] = shared_bandwidth

        combined_results: dict[str, Any] | None = None
        modcod_selection_payload: dict[str, Any] | None = None
        combined_cn_db: float | None = None
        combined_cn0_dbhz: float | None = None
        total_link_margin: float | None = None

        def _combine_cn_db(ul_cn: float, dl_cn: float) -> float:
            ul_lin = 10 ** (ul_cn / 10)
            dl_lin = 10 ** (dl_cn / 10)
            combined_lin = 1 / ((1 / ul_lin) + (1 / dl_lin))
            return 10 * math.log10(combined_lin)

        def _selected_modcod_entry_from_table(
            modcod_id: str | None,
            table_source,
            waveform_source,
            rolloff_value: float | None,
        ) -> dict[str, Any] | None:
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
                            effective_se = waveform_source.effective_spectral_efficiency(entry_obj, rolloff_value)  # type: ignore[arg-type]
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

        if transponder_type == TransponderType.TRANSPARENT:
            combined_bandwidth = downlink.bandwidth_hz or uplink.bandwidth_hz
            combined_cn_db = _combine_cn_db(uplink.cn_db, downlink.cn_db)
            combined_cn0_dbhz = combined_cn_db + 10 * math.log10(combined_bandwidth)
            combined_cni_db = _combine_cn_db(
                uplink.cni_db if uplink.cni_db is not None else uplink.cn_db,
                downlink.cni_db if downlink.cni_db is not None else downlink.cn_db,
            )
            combined_cni0_dbhz = combined_cni_db + 10 * math.log10(combined_bandwidth)

            (
                selected_entry,
                available_ebno,
                required_ebno,
                margin,
                bitrate_used,
            ) = self.communication_strategy.waveform.select_modcod_with_margin(  # type: ignore[arg-type]
                combined_cn0_dbhz,
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
                    available_link_ebno = cn0_dbhz - 10 * math.log10(bitrate_used)
                    return available_link_ebno - required_ebno

                uplink = replace(uplink, link_margin_db=_link_margin(uplink.cn0_dbhz))
                downlink = replace(downlink, link_margin_db=_link_margin(downlink.cn0_dbhz))
            elif margin is not None:
                uplink = replace(uplink, link_margin_db=margin)
                downlink = replace(downlink, link_margin_db=margin)

            combined_results = {
                "cn_db": combined_cn_db,
                "cn0_dbhz": combined_cn0_dbhz,
                "cni_db": combined_cni_db,
                "cni0_dbhz": combined_cni0_dbhz,
                "c_im_db": downlink.c_im_db,
                "link_margin_db": total_link_margin,
            }
            if total_link_margin is not None:
                combined_clean_cn = _combine_cn_db(ul_clean_cn, dl_clean_cn)
                combined_results["clean_link_margin_db"] = total_link_margin + (combined_clean_cn - combined_cn_db)
                combined_results["clean_cn_db"] = combined_clean_cn
            if selected_modcod:
                modcod_selection_payload = _selected_modcod_entry_from_table(
                    selected_modcod,
                    common_modcod_table,
                    self.communication_strategy.waveform,
                    rolloff,
                )
                if not modcod_selection_payload:
                    modcod_selection_payload = {"id": selected_modcod}
        else:
            def _apply_modcod(
                result: CalculationResult,
                waveform,
                table_source,
            ) -> tuple[CalculationResult, Any, Any, Any]:
                entry, available_ebno, required_ebno, margin, bitrate_used = waveform.select_modcod_with_margin(
                    result.cn0_dbhz,
                    result.bandwidth_hz,
                    rolloff,
                )
                updates: dict[str, Any] = {}
                if entry:
                    updates["modcod_selected"] = entry.id
                if required_ebno is not None and bitrate_used:
                    available_link_ebno = result.cn0_dbhz - 10 * math.log10(bitrate_used)
                    updates["link_margin_db"] = available_link_ebno - required_ebno
                elif margin is not None:
                    updates["link_margin_db"] = margin
                return replace(result, **updates) if updates else result, entry, table_source, waveform

            uplink, _, _, _ = _apply_modcod(uplink, uplink_waveform, uplink_modcod_table or common_modcod_table)
            downlink, _, _, _ = _apply_modcod(downlink, downlink_waveform, downlink_modcod_table or common_modcod_table)
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
            link_margins = [m for m in (uplink.link_margin_db, downlink.link_margin_db) if m is not None]
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

        results = {"uplink": asdict(uplink), "downlink": asdict(downlink), "combined": combined_results}
        payload_snapshot = None

        if include_snapshot:
            modcod_entries_snapshot: list[dict[str, Any]] | None = None
            uplink_modcod_entries_snapshot: list[dict[str, Any]] | None = None
            downlink_modcod_entries_snapshot: list[dict[str, Any]] | None = None
            if common_modcod_table:
                modcod_entries_snapshot = [
                    _clean_modcod_dict(entry if isinstance(entry, dict) else asdict(entry)) for entry in common_modcod_table.entries
                ]
            elif getattr(self.communication_strategy.waveform, "table", None):
                modcod_entries_snapshot = [
                    _clean_modcod_dict(entry if isinstance(entry, dict) else asdict(entry)) for entry in self.communication_strategy.waveform.table
                ]
            if uplink_modcod_table:
                uplink_modcod_entries_snapshot = [
                    _clean_modcod_dict(entry if isinstance(entry, dict) else asdict(entry)) for entry in uplink_modcod_table.entries
                ]
            if downlink_modcod_table:
                downlink_modcod_entries_snapshot = [
                    _clean_modcod_dict(entry if isinstance(entry, dict) else asdict(entry)) for entry in downlink_modcod_table.entries
                ]
            payload_snapshot = {
                "static": {
                    "modcod_table_id": payload.get("modcod_table_id"),
                    "modcod_table_version": getattr(common_modcod_table, "version", None),
                    "modcod_entries": modcod_entries_snapshot,
                    "uplink_modcod_table_id": payload.get("uplink_modcod_table_id"),
                    "uplink_modcod_table_version": getattr(uplink_modcod_table, "version", None),
                    "uplink_modcod_entries": uplink_modcod_entries_snapshot,
                    "downlink_modcod_table_id": payload.get("downlink_modcod_table_id"),
                    "downlink_modcod_table_version": getattr(downlink_modcod_table, "version", None),
                    "downlink_modcod_entries": downlink_modcod_entries_snapshot,
                    "itu_constants": {},
                },
                "entity": {
                    "satellite": {
                        "id": getattr(sat, "id", None),
                        "name": getattr(sat, "name", None),
                        "description": getattr(sat, "description", None),
                        "orbit_type": getattr(sat, "orbit_type", None),
                        "longitude_deg": getattr(sat, "longitude_deg", None),
                        "inclination_deg": getattr(sat, "inclination_deg", None),
                        "transponder_bandwidth_mhz": getattr(sat, "transponder_bandwidth_mhz", None),
                        "eirp_dbw": getattr(sat, "eirp_dbw", None),
                        "gt_db_per_k": getattr(sat, "gt_db_per_k", None),
                        "frequency_band": getattr(sat, "frequency_band", None),
                        "notes": getattr(sat, "notes", None),
                    }
                    if sat
                    else None,
                    "earth_station_tx": {
                        "id": getattr(tx_es, "id", None),
                        "name": getattr(tx_es, "name", None),
                        "description": getattr(tx_es, "description", None),
                        "antenna_diameter_m": getattr(tx_es, "antenna_diameter_m", None),
                        "antenna_gain_tx_db": getattr(tx_es, "antenna_gain_tx_db", None),
                        "antenna_gain_rx_db": getattr(tx_es, "antenna_gain_rx_db", None),
                        "noise_temperature_k": getattr(tx_es, "noise_temperature_k", None),
                        "eirp_dbw": getattr(tx_es, "eirp_dbw", None),
                        "tx_power_dbw": getattr(tx_es, "tx_power_dbw", None),
                        "gt_db_per_k": getattr(tx_es, "gt_db_per_k", None),
                        "polarization": getattr(tx_es, "polarization", None),
                        "notes": getattr(tx_es, "notes", None),
                    }
                    if tx_es
                    else None,
                    "earth_station_rx": {
                        "id": getattr(rx_es, "id", None),
                        "name": getattr(rx_es, "name", None),
                        "description": getattr(rx_es, "description", None),
                        "antenna_diameter_m": getattr(rx_es, "antenna_diameter_m", None),
                        "antenna_gain_tx_db": getattr(rx_es, "antenna_gain_tx_db", None),
                        "antenna_gain_rx_db": getattr(rx_es, "antenna_gain_rx_db", None),
                        "noise_temperature_k": getattr(rx_es, "noise_temperature_k", None),
                        "eirp_dbw": getattr(rx_es, "eirp_dbw", None),
                        "tx_power_dbw": getattr(rx_es, "tx_power_dbw", None),
                        "gt_db_per_k": getattr(rx_es, "gt_db_per_k", None),
                        "polarization": getattr(rx_es, "polarization", None),
                        "notes": getattr(rx_es, "notes", None),
                    }
                    if rx_es
                    else None,
                },
                "runtime": asdict(runtime),
                "strategy": {
                    "waveform_strategy": payload.get("waveform_strategy"),
                    "transponder_type": payload.get("transponder_type"),
                },
                "metadata": {
                    "schema_version": "1.1.0",
                    "computed_at": datetime.now(UTC),
                    "modcod_table_id": payload.get("modcod_table_id"),
                    "modcod_table_version": getattr(common_modcod_table, "version", None),
                    "uplink_modcod_table_id": payload.get("uplink_modcod_table_id"),
                    "downlink_modcod_table_id": payload.get("downlink_modcod_table_id"),
                    "satellite_id": sat_id,
                    "earth_station_tx_id": tx_id,
                    "earth_station_rx_id": rx_id,
                },
                "overrides": clean_overrides or None,
            }
        response: dict[str, Any] = {
            "schema_version": "1.1.0",
            "strategy": {
                "waveform_strategy": payload.get("waveform_strategy"),
                "transponder_type": payload.get("transponder_type"),
            },
            "results": results,
            "combined_link_margin_db": total_link_margin,
            "combined_cn_db": combined_cn_db,
            "combined_cn0_dbhz": combined_cn0_dbhz,
            "modcod_selected": modcod_selection_payload,
            "runtime_echo": runtime_echo,
        }
        if payload_snapshot:
            payload_snapshot["runtime"] = runtime_echo
        response["payload_snapshot"] = payload_snapshot
        return response
