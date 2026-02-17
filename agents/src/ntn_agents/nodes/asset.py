"""Asset resolution node for finding or proposing satellites and earth stations."""

from ntn_agents.state import LinkBudgetState, ResolvedAssets
from ntn_agents.tools.assets import (
    find_matching_earth_station,
    find_matching_satellite,
    list_modcod_tables,
)


async def asset_node(state: LinkBudgetState) -> LinkBudgetState:
    """Resolve assets (satellites, earth stations, ModCod tables) for the calculation.

    This node:
    1. Searches for matching satellites by name, longitude, or band
    2. Searches for matching earth stations by location
    3. Finds appropriate ModCod tables
    4. Proposes new assets if none match

    Args:
        state: Current workflow state with extracted_params

    Returns:
        Updated state with resolved_assets or proposed_assets
    """
    params = state.get("extracted_params", {})
    resolved: ResolvedAssets = {}
    missing: list[str] = []
    proposed: list[dict] = []

    # Resolve satellite
    satellite_name = params.get("satellite_name")
    sat_longitude = params.get("sat_longitude_deg")
    frequency_band = params.get("frequency_band")

    if satellite_name or sat_longitude:
        satellites = await find_matching_satellite.ainvoke({
            "longitude_deg": sat_longitude,
            "frequency_band": frequency_band,
            "name_contains": satellite_name,
            "longitude_tolerance": 2.0 if sat_longitude else 180.0,
        })

        if satellites:
            # Take the best match (first one)
            sat = satellites[0]
            resolved["satellite_id"] = sat["id"]
            resolved["satellite_name"] = sat["name"]
        else:
            missing.append("satellite")
            # Propose a new satellite
            proposed.append({
                "type": "satellite",
                "name": satellite_name or f"Satellite at {sat_longitude}°E",
                "longitude_deg": sat_longitude or 128.0,
                "frequency_band": frequency_band or "Ku",
                "orbit_type": "GEO",
                "eirp_dbw": 50.0,
                "gt_db_per_k": 20.0,
            })
    else:
        missing.append("satellite")

    # Resolve earth station (TX and RX)
    ground_lat = params.get("ground_lat_deg")
    ground_lon = params.get("ground_lon_deg")
    location_name = params.get("location_name")

    if ground_lat is not None and ground_lon is not None:
        stations = await find_matching_earth_station.ainvoke({
            "latitude_deg": ground_lat,
            "longitude_deg": ground_lon,
            "name_contains": location_name,
            "distance_tolerance_km": 50.0,
        })

        if stations:
            # Use first matching station for both TX and RX
            station = stations[0]
            resolved["earth_station_tx_id"] = station["id"]
            resolved["earth_station_tx_name"] = station["name"]
            resolved["earth_station_rx_id"] = station["id"]
            resolved["earth_station_rx_name"] = station["name"]
        else:
            missing.append("earth_station")
            # Propose a new earth station
            proposed.append({
                "type": "earth_station",
                "name": location_name or f"Station at {ground_lat:.2f}, {ground_lon:.2f}",
                "latitude_deg": ground_lat,
                "longitude_deg": ground_lon,
                "altitude_m": params.get("ground_alt_m", 0.0),
                "antenna_diameter_m": 1.2,
                "tx_power_dbw": 10.0,
                "polarization": "RHCP",
            })
    else:
        missing.append("earth_station")

    # Resolve ModCod table
    # Look for a DVB-S2X table by default
    modcod_tables = await list_modcod_tables.ainvoke({"waveform": "DVB_S2X"})

    if modcod_tables:
        # Prefer published tables
        published = [t for t in modcod_tables if t.get("published")]
        table = published[0] if published else modcod_tables[0]
        resolved["modcod_table_id"] = table["id"]
        resolved["modcod_table_name"] = table.get("version", "default")
    else:
        missing.append("modcod_table")

    # Determine if we're ready to calculate
    assets_ready = all(
        key in resolved
        for key in ["satellite_id", "earth_station_tx_id", "earth_station_rx_id"]
    )

    # If assets are missing but we have proposals, ask for confirmation
    awaiting_confirmation = bool(proposed) and not assets_ready

    return {
        **state,
        "resolved_assets": resolved,
        "assets_ready": assets_ready,
        "missing_assets": missing,
        "proposed_assets": proposed,
        "awaiting_confirmation": awaiting_confirmation,
        "confirmation_type": "asset_creation" if awaiting_confirmation else None,
        "confirmation_message": _build_confirmation_message(proposed) if proposed else None,
    }


def _build_confirmation_message(proposed: list[dict]) -> str:
    """Build a human-readable confirmation message for proposed assets."""
    lines = ["The following assets need to be created:"]

    for asset in proposed:
        asset_type = asset.get("type", "unknown")
        name = asset.get("name", "unnamed")

        if asset_type == "satellite":
            lon = asset.get("longitude_deg", 0)
            band = asset.get("frequency_band", "unknown")
            lines.append(f"  - Satellite: {name} at {lon}°E ({band}-band)")

        elif asset_type == "earth_station":
            lat = asset.get("latitude_deg", 0)
            lon = asset.get("longitude_deg", 0)
            lines.append(f"  - Earth Station: {name} at ({lat:.2f}°, {lon:.2f}°)")

    lines.append("\nProceed with creation? (yes/no)")

    return "\n".join(lines)
