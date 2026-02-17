"""Link budget calculation tool for LangChain agents."""

from typing import Any

import httpx
from langchain_core.tools import tool

from ntn_agents.config import settings


@tool
async def calculate_link_budget(
    satellite_id: str,
    earth_station_tx_id: str,
    earth_station_rx_id: str,
    modcod_table_id: str,
    sat_longitude_deg: float,
    uplink_frequency_hz: float,
    uplink_bandwidth_hz: float,
    uplink_elevation_deg: float,
    uplink_rain_rate_mm_per_hr: float,
    uplink_temperature_k: float,
    uplink_ground_lat_deg: float,
    uplink_ground_lon_deg: float,
    uplink_ground_alt_m: float,
    downlink_frequency_hz: float,
    downlink_bandwidth_hz: float,
    downlink_elevation_deg: float,
    downlink_rain_rate_mm_per_hr: float,
    downlink_temperature_k: float,
    downlink_ground_lat_deg: float,
    downlink_ground_lon_deg: float,
    downlink_ground_alt_m: float,
    transponder_type: str = "TRANSPARENT",
    rolloff: float = 0.2,
    include_snapshot: bool = False,
) -> dict[str, Any]:
    """Calculate satellite link budget using the backend API.

    This tool performs a complete link budget calculation including:
    - Free space path loss (FSPL)
    - Rain attenuation (ITU-R P.618)
    - Gaseous attenuation (ITU-R P.676)
    - Cloud attenuation (ITU-R P.840)
    - ModCod selection for the calculated C/N0

    Args:
        satellite_id: UUID of the satellite asset
        earth_station_tx_id: UUID of the transmitting earth station
        earth_station_rx_id: UUID of the receiving earth station
        modcod_table_id: UUID of the ModCod table to use
        sat_longitude_deg: Satellite orbital longitude in degrees
        uplink_frequency_hz: Uplink frequency in Hz
        uplink_bandwidth_hz: Uplink bandwidth in Hz
        uplink_elevation_deg: Uplink elevation angle in degrees
        uplink_rain_rate_mm_per_hr: Uplink rain rate in mm/hr
        uplink_temperature_k: Uplink atmospheric temperature in Kelvin
        uplink_ground_lat_deg: TX earth station latitude in degrees
        uplink_ground_lon_deg: TX earth station longitude in degrees
        uplink_ground_alt_m: TX earth station altitude in meters
        downlink_frequency_hz: Downlink frequency in Hz
        downlink_bandwidth_hz: Downlink bandwidth in Hz
        downlink_elevation_deg: Downlink elevation angle in degrees
        downlink_rain_rate_mm_per_hr: Downlink rain rate in mm/hr
        downlink_temperature_k: Downlink atmospheric temperature in Kelvin
        downlink_ground_lat_deg: RX earth station latitude in degrees
        downlink_ground_lon_deg: RX earth station longitude in degrees
        downlink_ground_alt_m: RX earth station altitude in meters
        transponder_type: Either "TRANSPARENT" or "REGENERATIVE"
        rolloff: Symbol rolloff factor (default 0.2)
        include_snapshot: Whether to include full snapshot for scenario saving

    Returns:
        Dictionary containing calculation results including C/N, margin, and losses.
    """
    payload = {
        "satellite_id": satellite_id,
        "earth_station_tx_id": earth_station_tx_id,
        "earth_station_rx_id": earth_station_rx_id,
        "transponder_type": transponder_type,
        "modcod_table_id": modcod_table_id,
        "include_snapshot": include_snapshot,
        "runtime": {
            "sat_longitude_deg": sat_longitude_deg,
            "rolloff": rolloff,
            "uplink": {
                "frequency_hz": uplink_frequency_hz,
                "bandwidth_hz": uplink_bandwidth_hz,
                "elevation_deg": uplink_elevation_deg,
                "rain_rate_mm_per_hr": uplink_rain_rate_mm_per_hr,
                "temperature_k": uplink_temperature_k,
                "ground_lat_deg": uplink_ground_lat_deg,
                "ground_lon_deg": uplink_ground_lon_deg,
                "ground_alt_m": uplink_ground_alt_m,
            },
            "downlink": {
                "frequency_hz": downlink_frequency_hz,
                "bandwidth_hz": downlink_bandwidth_hz,
                "elevation_deg": downlink_elevation_deg,
                "rain_rate_mm_per_hr": downlink_rain_rate_mm_per_hr,
                "temperature_k": downlink_temperature_k,
                "ground_lat_deg": downlink_ground_lat_deg,
                "ground_lon_deg": downlink_ground_lon_deg,
                "ground_alt_m": downlink_ground_alt_m,
            },
        },
    }

    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.post(
            "/api/v1/link-budgets/calculate",
            json=payload,
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def calculate_link_budget_simple(
    satellite_id: str,
    earth_station_tx_id: str,
    earth_station_rx_id: str,
    modcod_table_id: str,
    uplink_frequency_hz: float,
    downlink_frequency_hz: float,
    bandwidth_hz: float,
    rain_rate_mm_per_hr: float = 30.0,
    temperature_k: float = 290.0,
) -> dict[str, Any]:
    """Simplified link budget calculation with automatic parameter inference.

    This is a convenience wrapper that automatically computes elevation angles
    and uses the same location for TX/RX (typical single-site calculation).

    Args:
        satellite_id: UUID of the satellite asset
        earth_station_tx_id: UUID of the transmitting earth station
        earth_station_rx_id: UUID of the receiving earth station
        modcod_table_id: UUID of the ModCod table to use
        uplink_frequency_hz: Uplink frequency in Hz
        downlink_frequency_hz: Downlink frequency in Hz
        bandwidth_hz: Channel bandwidth in Hz (used for both up/down)
        rain_rate_mm_per_hr: Rain rate in mm/hr (default 30 for 0.01% avail)
        temperature_k: Atmospheric temperature in Kelvin (default 290K)

    Returns:
        Dictionary containing calculation results.
    """
    # First, fetch asset information to get locations
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        # Get satellite info
        sat_response = await client.get(f"/api/v1/assets/satellites/{satellite_id}")
        sat_response.raise_for_status()
        satellite = sat_response.json()

        # Get TX earth station info
        tx_response = await client.get(f"/api/v1/assets/earth-stations/{earth_station_tx_id}")
        tx_response.raise_for_status()
        tx_station = tx_response.json()

        # Get RX earth station info
        rx_response = await client.get(f"/api/v1/assets/earth-stations/{earth_station_rx_id}")
        rx_response.raise_for_status()
        rx_station = rx_response.json()

    # Build the full calculation request
    return await calculate_link_budget.ainvoke({
        "satellite_id": satellite_id,
        "earth_station_tx_id": earth_station_tx_id,
        "earth_station_rx_id": earth_station_rx_id,
        "modcod_table_id": modcod_table_id,
        "sat_longitude_deg": satellite.get("longitude_deg", 128.0),
        "uplink_frequency_hz": uplink_frequency_hz,
        "uplink_bandwidth_hz": bandwidth_hz,
        "uplink_elevation_deg": 45.0,  # Will be calculated by backend
        "uplink_rain_rate_mm_per_hr": rain_rate_mm_per_hr,
        "uplink_temperature_k": temperature_k,
        "uplink_ground_lat_deg": tx_station.get("latitude_deg", 35.6762),
        "uplink_ground_lon_deg": tx_station.get("longitude_deg", 139.6503),
        "uplink_ground_alt_m": tx_station.get("altitude_m", 0),
        "downlink_frequency_hz": downlink_frequency_hz,
        "downlink_bandwidth_hz": bandwidth_hz,
        "downlink_elevation_deg": 45.0,  # Will be calculated by backend
        "downlink_rain_rate_mm_per_hr": rain_rate_mm_per_hr,
        "downlink_temperature_k": temperature_k,
        "downlink_ground_lat_deg": rx_station.get("latitude_deg", 35.6762),
        "downlink_ground_lon_deg": rx_station.get("longitude_deg", 139.6503),
        "downlink_ground_alt_m": rx_station.get("altitude_m", 0),
        "transponder_type": "TRANSPARENT",
        "rolloff": 0.2,
        "include_snapshot": False,
    })
