"""Satellite elevation angle computation."""

import math

EARTH_RADIUS_KM = 6378.0
GEO_ALTITUDE_KM = 35786.0


def compute_elevation(
    sat_lat_deg: float,
    sat_lon_deg: float,
    sat_alt_km: float,
    ground_lat_deg: float,
    ground_lon_deg: float,
    ground_alt_m: float,
) -> float:
    """Elevation angle (deg) for any orbit using spherical approximation.

    Uses the general central angle formula:
      cos(psi) = sin(lat_g)*sin(lat_s) + cos(lat_g)*cos(lat_s)*cos(delta_lon)
    Then:
      elev = atan( (cos(psi) - Re/Rs) / sin(psi) )

    For GEO (sat_lat=0), this reduces to the classic GEO formula since sin(0)=0.
    """
    re_km = EARTH_RADIUS_KM + (ground_alt_m / 1000.0)
    rs_km = EARTH_RADIUS_KM + sat_alt_km

    lat_g_rad = math.radians(ground_lat_deg)
    lat_s_rad = math.radians(sat_lat_deg)
    delta_lon_rad = math.radians(sat_lon_deg - ground_lon_deg)

    cos_psi = (
        math.sin(lat_g_rad) * math.sin(lat_s_rad)
        + math.cos(lat_g_rad) * math.cos(lat_s_rad) * math.cos(delta_lon_rad)
    )
    cos_psi = max(-1.0, min(1.0, cos_psi))
    psi = math.acos(cos_psi)
    sin_psi = math.sin(psi)

    if sin_psi == 0:
        return 90.0

    elev_rad = math.atan((math.cos(psi) - (re_km / rs_km)) / sin_psi)
    return math.degrees(elev_rad)


def compute_geo_elevation(
    sat_lon_deg: float,
    ground_lat_deg: float,
    ground_lon_deg: float,
    ground_alt_m: float,
) -> float:
    """GEO elevation (deg) — wrapper around compute_elevation with GEO defaults.

    Kept for backward compatibility.
    """
    return compute_elevation(
        sat_lat_deg=0.0,
        sat_lon_deg=sat_lon_deg,
        sat_alt_km=GEO_ALTITUDE_KM,
        ground_lat_deg=ground_lat_deg,
        ground_lon_deg=ground_lon_deg,
        ground_alt_m=ground_alt_m,
    )
