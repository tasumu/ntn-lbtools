"""Build payload snapshots for scenario persistence."""

from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

from src.core.models.common import LinkDirectionParameters, RuntimeParameters
from src.core.strategies.dvbs2x import _clean_modcod_dict


def _runtime_direction_echo(
    params: LinkDirectionParameters,
    interference_block: dict[str, Any],
) -> dict[str, Any]:
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


def build_runtime_echo(
    runtime: RuntimeParameters,
    rolloff: float | None,
    uplink_data: dict[str, Any],
    downlink_data: dict[str, Any],
    intermod_block: dict[str, Any] | None,
    shared_bandwidth: float | None,
    is_transparent: bool,
) -> dict[str, Any]:
    """Build the runtime echo section of the response."""
    echo = {
        "sat_longitude_deg": runtime.sat_longitude_deg,
        "rolloff": rolloff,
        "uplink": _runtime_direction_echo(runtime.uplink, uplink_data.get("interference") or {}),
        "downlink": _runtime_direction_echo(
            runtime.downlink,
            downlink_data.get("interference") or {},
        ),
        "intermodulation": intermod_block or None,
    }
    if shared_bandwidth is not None and is_transparent:
        echo["bandwidth_hz"] = shared_bandwidth
    return echo


def _serialize_asset(obj: Any, fields: list[str]) -> dict[str, Any] | None:
    if obj is None:
        return None
    return {f: getattr(obj, f, None) for f in fields}


_SATELLITE_FIELDS = [
    "id",
    "name",
    "description",
    "orbit_type",
    "longitude_deg",
    "inclination_deg",
    "transponder_bandwidth_mhz",
    "eirp_dbw",
    "gt_db_per_k",
    "frequency_band",
    "notes",
]

_EARTH_STATION_FIELDS = [
    "id",
    "name",
    "description",
    "antenna_diameter_m",
    "antenna_gain_tx_db",
    "antenna_gain_rx_db",
    "noise_temperature_k",
    "eirp_dbw",
    "tx_power_dbw",
    "gt_db_per_k",
    "polarization",
    "notes",
]


def _snapshot_entries(table: Any) -> list[dict[str, Any]] | None:
    if not table:
        return None
    return [_clean_modcod_dict(e if isinstance(e, dict) else asdict(e)) for e in table.entries]


def build_payload_snapshot(
    payload: dict[str, Any],
    runtime: RuntimeParameters,
    runtime_echo: dict[str, Any],
    sat: Any,
    tx_es: Any,
    rx_es: Any,
    common_modcod_table: Any,
    uplink_modcod_table: Any,
    downlink_modcod_table: Any,
    waveform: Any,
    sat_id: str | None,
    tx_id: str | None,
    rx_id: str | None,
    clean_overrides: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build the full payload snapshot for scenario persistence."""
    modcod_entries_snapshot = _snapshot_entries(common_modcod_table)
    if modcod_entries_snapshot is None and getattr(waveform, "table", None):
        modcod_entries_snapshot = [
            _clean_modcod_dict(e if isinstance(e, dict) else asdict(e)) for e in waveform.table
        ]
    uplink_modcod_entries_snapshot = _snapshot_entries(uplink_modcod_table)
    downlink_modcod_entries_snapshot = _snapshot_entries(downlink_modcod_table)

    return {
        "static": {
            "modcod_table_id": payload.get("modcod_table_id"),
            "modcod_table_name": getattr(common_modcod_table, "name", None),
            "modcod_table_version": getattr(common_modcod_table, "version", None),
            "modcod_entries": modcod_entries_snapshot,
            "uplink_modcod_table_id": payload.get("uplink_modcod_table_id"),
            "uplink_modcod_table_name": getattr(uplink_modcod_table, "name", None),
            "uplink_modcod_table_version": getattr(uplink_modcod_table, "version", None),
            "uplink_modcod_entries": uplink_modcod_entries_snapshot,
            "downlink_modcod_table_id": payload.get("downlink_modcod_table_id"),
            "downlink_modcod_table_name": getattr(downlink_modcod_table, "name", None),
            "downlink_modcod_table_version": getattr(downlink_modcod_table, "version", None),
            "downlink_modcod_entries": downlink_modcod_entries_snapshot,
            "itu_constants": {},
        },
        "entity": {
            "satellite": _serialize_asset(sat, _SATELLITE_FIELDS),
            "earth_station_tx": _serialize_asset(tx_es, _EARTH_STATION_FIELDS),
            "earth_station_rx": _serialize_asset(rx_es, _EARTH_STATION_FIELDS),
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
            "modcod_table_name": getattr(common_modcod_table, "name", None),
            "modcod_table_version": getattr(common_modcod_table, "version", None),
            "uplink_modcod_table_id": payload.get("uplink_modcod_table_id"),
            "downlink_modcod_table_id": payload.get("downlink_modcod_table_id"),
            "satellite_id": sat_id,
            "earth_station_tx_id": tx_id,
            "earth_station_rx_id": rx_id,
        },
        "overrides": clean_overrides or None,
    }
