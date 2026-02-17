"""Known locations and satellites for quick reference."""

from typing import TypedDict


class LocationInfo(TypedDict):
    """Information about a known location."""

    name: str
    latitude_deg: float
    longitude_deg: float
    altitude_m: float
    country: str
    typical_rain_rate: float  # mm/hr for 0.01% availability
    climate_zone: str


class SatelliteInfo(TypedDict):
    """Information about a known satellite."""

    name: str
    longitude_deg: float
    operator: str
    frequency_bands: list[str]
    orbit_type: str
    notes: str


# Major cities and earth station locations
KNOWN_LOCATIONS: dict[str, LocationInfo] = {
    # Japan
    "tokyo": {
        "name": "Tokyo",
        "latitude_deg": 35.6762,
        "longitude_deg": 139.6503,
        "altitude_m": 40,
        "country": "Japan",
        "typical_rain_rate": 50.0,
        "climate_zone": "temperate",
    },
    "osaka": {
        "name": "Osaka",
        "latitude_deg": 34.6937,
        "longitude_deg": 135.5023,
        "altitude_m": 10,
        "country": "Japan",
        "typical_rain_rate": 50.0,
        "climate_zone": "temperate",
    },
    "sapporo": {
        "name": "Sapporo",
        "latitude_deg": 43.0618,
        "longitude_deg": 141.3545,
        "altitude_m": 20,
        "country": "Japan",
        "typical_rain_rate": 35.0,
        "climate_zone": "cold",
    },
    "naha": {
        "name": "Naha (Okinawa)",
        "latitude_deg": 26.2124,
        "longitude_deg": 127.6809,
        "altitude_m": 10,
        "country": "Japan",
        "typical_rain_rate": 80.0,
        "climate_zone": "subtropical",
    },
    "yamaguchi": {
        "name": "Yamaguchi (KDDI Ground Station)",
        "latitude_deg": 34.1861,
        "longitude_deg": 131.4706,
        "altitude_m": 100,
        "country": "Japan",
        "typical_rain_rate": 45.0,
        "climate_zone": "temperate",
    },
    # Asia-Pacific
    "singapore": {
        "name": "Singapore",
        "latitude_deg": 1.3521,
        "longitude_deg": 103.8198,
        "altitude_m": 15,
        "country": "Singapore",
        "typical_rain_rate": 120.0,
        "climate_zone": "tropical",
    },
    "hong_kong": {
        "name": "Hong Kong",
        "latitude_deg": 22.3193,
        "longitude_deg": 114.1694,
        "altitude_m": 50,
        "country": "Hong Kong",
        "typical_rain_rate": 95.0,
        "climate_zone": "subtropical",
    },
    "sydney": {
        "name": "Sydney",
        "latitude_deg": -33.8688,
        "longitude_deg": 151.2093,
        "altitude_m": 58,
        "country": "Australia",
        "typical_rain_rate": 40.0,
        "climate_zone": "temperate",
    },
    "perth": {
        "name": "Perth",
        "latitude_deg": -31.9505,
        "longitude_deg": 115.8605,
        "altitude_m": 30,
        "country": "Australia",
        "typical_rain_rate": 25.0,
        "climate_zone": "mediterranean",
    },
    # North America
    "new_york": {
        "name": "New York",
        "latitude_deg": 40.7128,
        "longitude_deg": -74.0060,
        "altitude_m": 10,
        "country": "USA",
        "typical_rain_rate": 45.0,
        "climate_zone": "temperate",
    },
    "los_angeles": {
        "name": "Los Angeles",
        "latitude_deg": 34.0522,
        "longitude_deg": -118.2437,
        "altitude_m": 71,
        "country": "USA",
        "typical_rain_rate": 15.0,
        "climate_zone": "mediterranean",
    },
    "miami": {
        "name": "Miami",
        "latitude_deg": 25.7617,
        "longitude_deg": -80.1918,
        "altitude_m": 2,
        "country": "USA",
        "typical_rain_rate": 100.0,
        "climate_zone": "tropical",
    },
    # Europe
    "london": {
        "name": "London",
        "latitude_deg": 51.5074,
        "longitude_deg": -0.1278,
        "altitude_m": 11,
        "country": "UK",
        "typical_rain_rate": 25.0,
        "climate_zone": "temperate",
    },
    "paris": {
        "name": "Paris",
        "latitude_deg": 48.8566,
        "longitude_deg": 2.3522,
        "altitude_m": 35,
        "country": "France",
        "typical_rain_rate": 25.0,
        "climate_zone": "temperate",
    },
    "frankfurt": {
        "name": "Frankfurt",
        "latitude_deg": 50.1109,
        "longitude_deg": 8.6821,
        "altitude_m": 112,
        "country": "Germany",
        "typical_rain_rate": 25.0,
        "climate_zone": "temperate",
    },
}


# Satellite data is intentionally not included in the codebase.
# Satellite information (name, orbital position, operator, frequency bands)
# should be managed through the application's Assets API or a future
# external database integration.
# The lookup functions below remain functional and will work with any
# entries added to this dictionary or a future data source.
KNOWN_SATELLITES: dict[str, SatelliteInfo] = {}

SATELLITE_ALIASES: dict[str, str] = {}


def get_location_info(name: str) -> LocationInfo | None:
    """Get information about a known location.

    Args:
        name: Location name (case-insensitive)

    Returns:
        LocationInfo or None if not found.
    """
    normalized = name.strip().lower().replace(" ", "_")
    return KNOWN_LOCATIONS.get(normalized)


def get_satellite_info(name: str) -> SatelliteInfo | None:
    """Get information about a known satellite.

    Args:
        name: Satellite name (case-insensitive)

    Returns:
        SatelliteInfo or None if not found.
    """
    normalized = name.strip().lower()

    # Check aliases first
    if normalized in SATELLITE_ALIASES:
        normalized = SATELLITE_ALIASES[normalized]

    return KNOWN_SATELLITES.get(normalized)


def find_satellites_by_band(band: str) -> list[SatelliteInfo]:
    """Find satellites that support a specific frequency band.

    Args:
        band: Frequency band (e.g., "Ku", "Ka")

    Returns:
        List of matching satellites.
    """
    band_upper = band.upper()
    matches = []

    for info in KNOWN_SATELLITES.values():
        if band_upper in [b.upper() for b in info["frequency_bands"]]:
            matches.append(info)

    return matches


def find_satellites_by_longitude_range(
    min_lon: float,
    max_lon: float,
) -> list[SatelliteInfo]:
    """Find satellites within a longitude range.

    Args:
        min_lon: Minimum longitude (degrees)
        max_lon: Maximum longitude (degrees)

    Returns:
        List of matching satellites.
    """
    matches = []

    for info in KNOWN_SATELLITES.values():
        lon = info["longitude_deg"]
        if min_lon <= lon <= max_lon:
            matches.append(info)

    return matches
