"""Asset management tools for LangChain agents."""

from typing import Any

import httpx
from langchain_core.tools import tool

from ntn_agents.config import settings
from ntn_agents.tools._validation import validate_uuid


@tool
async def list_satellites() -> list[dict[str, Any]]:
    """List all registered satellites.

    Returns a list of satellite assets with their properties including:
    - id: Unique identifier (UUID)
    - name: Satellite name
    - orbit_type: GEO, MEO, or LEO
    - longitude_deg: Orbital longitude for GEO satellites
    - frequency_band: Supported frequency bands
    - eirp_dbw: Equivalent Isotropic Radiated Power
    - gt_db_per_k: G/T (gain-to-noise-temperature ratio)

    Returns:
        List of satellite dictionaries.
    """
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get("/api/v1/assets/satellites", timeout=10.0)
        response.raise_for_status()
        return response.json()


@tool
async def list_earth_stations() -> list[dict[str, Any]]:
    """List all registered earth stations.

    Returns a list of earth station assets with their properties including:
    - id: Unique identifier (UUID)
    - name: Station name
    - latitude_deg, longitude_deg: Geographic coordinates
    - altitude_m: Altitude above sea level
    - antenna_diameter_m: Antenna diameter
    - antenna_gain_db: Antenna gain
    - tx_power_dbw: Transmit power
    - polarization: Antenna polarization

    Returns:
        List of earth station dictionaries.
    """
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get("/api/v1/assets/earth-stations", timeout=10.0)
        response.raise_for_status()
        return response.json()


@tool
async def list_modcod_tables(waveform: str | None = None) -> list[dict[str, Any]]:
    """List all registered ModCod tables.

    ModCod tables define the modulation and coding schemes available for
    link budget calculations. Each entry specifies required C/N0 or Eb/N0
    thresholds.

    Args:
        waveform: Optional filter by waveform type (e.g., "DVB_S2X")

    Returns:
        List of ModCod table dictionaries.
    """
    params = {}
    if waveform:
        params["waveform"] = waveform

    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get(
            "/api/v1/assets/modcod-tables",
            params=params,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def create_satellite(
    name: str,
    orbit_type: str,
    longitude_deg: float,
    frequency_band: str,
    eirp_dbw: float,
    gt_db_per_k: float,
    transponder_bandwidth_mhz: float = 36.0,
    notes: str = "",
) -> dict[str, Any]:
    """Create a new satellite asset.

    Args:
        name: Satellite name (e.g., "GEO-SAT-1")
        orbit_type: Orbit type ("GEO", "MEO", "LEO")
        longitude_deg: Orbital longitude in degrees (for GEO)
        frequency_band: Frequency band ("C", "Ku", "Ka", etc.)
        eirp_dbw: EIRP in dBW
        gt_db_per_k: G/T in dB/K
        transponder_bandwidth_mhz: Transponder bandwidth in MHz (default 36)
        notes: Optional notes about the satellite

    Returns:
        Created satellite dictionary with assigned UUID.
    """
    payload = {
        "name": name,
        "orbit_type": orbit_type,
        "longitude_deg": longitude_deg,
        "frequency_band": frequency_band,
        "eirp_dbw": eirp_dbw,
        "gt_db_per_k": gt_db_per_k,
        "transponder_bandwidth_mhz": transponder_bandwidth_mhz,
        "notes": notes,
    }

    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.post(
            "/api/v1/assets/satellites",
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def create_earth_station(
    name: str,
    latitude_deg: float,
    longitude_deg: float,
    altitude_m: float = 0.0,
    antenna_diameter_m: float | None = None,
    antenna_gain_db: float | None = None,
    tx_power_dbw: float = 10.0,
    polarization: str = "RHCP",
    notes: str = "",
) -> dict[str, Any]:
    """Create a new earth station asset.

    Either antenna_diameter_m or antenna_gain_db should be provided.
    If antenna_diameter_m is provided, gain will be calculated from diameter.

    Args:
        name: Station name (e.g., "Tokyo Hub")
        latitude_deg: Latitude in degrees
        longitude_deg: Longitude in degrees
        altitude_m: Altitude above sea level in meters (default 0)
        antenna_diameter_m: Antenna diameter in meters
        antenna_gain_db: Antenna gain in dB (alternative to diameter)
        tx_power_dbw: Transmit power in dBW (default 10)
        polarization: Polarization type ("RHCP", "LHCP", "H", "V")
        notes: Optional notes about the station

    Returns:
        Created earth station dictionary with assigned UUID.
    """
    payload = {
        "name": name,
        "latitude_deg": latitude_deg,
        "longitude_deg": longitude_deg,
        "altitude_m": altitude_m,
        "tx_power_dbw": tx_power_dbw,
        "polarization": polarization,
        "notes": notes,
    }

    if antenna_diameter_m is not None:
        payload["antenna_diameter_m"] = antenna_diameter_m
    if antenna_gain_db is not None:
        payload["antenna_gain_db"] = antenna_gain_db

    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.post(
            "/api/v1/assets/earth-stations",
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def get_satellite(satellite_id: str) -> dict[str, Any]:
    """Get details of a specific satellite.

    Args:
        satellite_id: UUID of the satellite

    Returns:
        Satellite dictionary.
    """
    validate_uuid(satellite_id, "satellite_id")
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get(
            f"/api/v1/assets/satellites/{satellite_id}",
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def get_earth_station(earth_station_id: str) -> dict[str, Any]:
    """Get details of a specific earth station.

    Args:
        earth_station_id: UUID of the earth station

    Returns:
        Earth station dictionary.
    """
    validate_uuid(earth_station_id, "earth_station_id")
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get(
            f"/api/v1/assets/earth-stations/{earth_station_id}",
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def find_matching_satellite(
    longitude_deg: float | None = None,
    frequency_band: str | None = None,
    name_contains: str | None = None,
    longitude_tolerance: float = 5.0,
) -> list[dict[str, Any]]:
    """Find satellites matching specified criteria.

    Args:
        longitude_deg: Target orbital longitude (with tolerance)
        frequency_band: Required frequency band
        name_contains: Substring to match in satellite name
        longitude_tolerance: Tolerance for longitude matching in degrees

    Returns:
        List of matching satellite dictionaries.
    """
    satellites = await list_satellites.ainvoke({})
    matches = []

    for sat in satellites:
        # Check longitude
        if longitude_deg is not None:
            sat_lon = sat.get("longitude_deg")
            if sat_lon is None:
                continue
            if abs(sat_lon - longitude_deg) > longitude_tolerance:
                continue

        # Check frequency band
        if frequency_band is not None:
            sat_band = sat.get("frequency_band", "")
            if frequency_band.upper() not in sat_band.upper():
                continue

        # Check name
        if name_contains is not None:
            sat_name = sat.get("name", "")
            if name_contains.lower() not in sat_name.lower():
                continue

        matches.append(sat)

    return matches


@tool
async def find_matching_earth_station(
    latitude_deg: float | None = None,
    longitude_deg: float | None = None,
    name_contains: str | None = None,
    distance_tolerance_km: float = 100.0,
) -> list[dict[str, Any]]:
    """Find earth stations matching specified criteria.

    Args:
        latitude_deg: Target latitude
        longitude_deg: Target longitude
        name_contains: Substring to match in station name
        distance_tolerance_km: Maximum distance from target location in km

    Returns:
        List of matching earth station dictionaries.
    """
    import math

    stations = await list_earth_stations.ainvoke({})
    matches = []

    for station in stations:
        # Check location (approximate distance)
        if latitude_deg is not None and longitude_deg is not None:
            stn_lat = station.get("latitude_deg")
            stn_lon = station.get("longitude_deg")
            if stn_lat is None or stn_lon is None:
                continue

            # Simple spherical distance approximation
            lat1, lon1 = math.radians(latitude_deg), math.radians(longitude_deg)
            lat2, lon2 = math.radians(stn_lat), math.radians(stn_lon)
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            c = 2 * math.asin(math.sqrt(a))
            distance_km = 6371 * c  # Earth radius in km

            if distance_km > distance_tolerance_km:
                continue

        # Check name
        if name_contains is not None:
            stn_name = station.get("name", "")
            if name_contains.lower() not in stn_name.lower():
                continue

        matches.append(station)

    return matches
