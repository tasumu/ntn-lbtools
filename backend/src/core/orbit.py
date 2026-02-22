"""TLE orbit propagation using Skyfield."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from skyfield.api import EarthSatellite, wgs84

from src.core.propagation import _timescale


@dataclass
class SatellitePosition:
    latitude_deg: float
    longitude_deg: float
    altitude_km: float
    epoch: datetime | None = None


def _validate_tle_lines(tle_line1: str, tle_line2: str) -> None:
    """Basic TLE format validation before passing to Skyfield."""
    if not tle_line1.startswith("1 ") or not tle_line2.startswith("2 "):
        raise ValueError("Invalid TLE format: line 1 must start with '1 ' and line 2 with '2 '")
    if len(tle_line1) < 69 or len(tle_line2) < 69:
        raise ValueError("Invalid TLE format: each line must be at least 69 characters")


def _build_satellite(
    tle_line1: str,
    tle_line2: str,
    name: str,
) -> EarthSatellite:
    """Create a Skyfield EarthSatellite from TLE lines.

    Raises ValueError if the TLE cannot be parsed.
    """
    ts = _timescale
    if ts is None:
        raise RuntimeError("Skyfield timescale not available")
    _validate_tle_lines(tle_line1, tle_line2)
    try:
        sat = EarthSatellite(tle_line1, tle_line2, name, ts)
    except Exception as exc:
        raise ValueError(f"Invalid TLE format: {exc}") from exc
    return sat


def _resolve_time(computation_time: datetime | None):
    """Convert a datetime to a Skyfield Time object."""
    ts = _timescale
    if ts is None:
        raise RuntimeError("Skyfield timescale not available")
    if computation_time is None:
        return ts.now()
    if computation_time.tzinfo is None:
        computation_time = computation_time.replace(tzinfo=UTC)
    return ts.from_datetime(computation_time)


def propagate_tle(
    tle_line1: str,
    tle_line2: str,
    name: str,
    computation_time: datetime | None = None,
) -> SatellitePosition:
    """Propagate TLE to get sub-satellite point at the given time."""
    sat = _build_satellite(tle_line1, tle_line2, name)
    t = _resolve_time(computation_time)
    geocentric = sat.at(t)
    subpoint = wgs84.subpoint(geocentric)

    epoch_dt = sat.epoch.utc_datetime()

    return SatellitePosition(
        latitude_deg=subpoint.latitude.degrees,
        longitude_deg=subpoint.longitude.degrees,
        altitude_km=subpoint.elevation.km,
        epoch=epoch_dt,
    )


def compute_look_angles(
    tle_line1: str,
    tle_line2: str,
    name: str,
    ground_lat_deg: float,
    ground_lon_deg: float,
    ground_alt_m: float,
    computation_time: datetime | None = None,
) -> tuple[float, float, float]:
    """Compute elevation, azimuth, and slant range from a ground station to a TLE satellite.

    Returns:
        (elevation_deg, azimuth_deg, slant_range_km)
    """
    sat = _build_satellite(tle_line1, tle_line2, name)
    t = _resolve_time(computation_time)

    site = wgs84.latlon(ground_lat_deg, ground_lon_deg, elevation_m=ground_alt_m)
    difference = sat - site
    topocentric = difference.at(t)
    alt, az, distance = topocentric.altaz()

    return alt.degrees, az.degrees, distance.km
