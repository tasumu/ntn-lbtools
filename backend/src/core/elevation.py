"""GEO satellite elevation angle computation."""

import math


def compute_geo_elevation(
    sat_lon_deg: float,
    ground_lat_deg: float,
    ground_lon_deg: float,
    ground_alt_m: float,
) -> float:
    """
    GEO elevation (deg) using standard spherical approximation.

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
