import math
from dataclasses import dataclass

from itur.models import itu618, itu676, itu840

try:  # optional dependency
    from skyfield.api import Loader, wgs84
except Exception:  # pragma: no cover
    wgs84 = None
    Loader = None

try:  # optional dependency
    from scipy.constants import c as SPEED_OF_LIGHT  # noqa: N812
except Exception:  # pragma: no cover
    SPEED_OF_LIGHT = 299_792_458.0

GEO_ALTITUDE_KM = 35786
EARTH_RADIUS_KM = 6371
KB = -228.6  # Boltzmann constant in dBW/K/Hz
DEFAULT_WATER_VAPOR_DENSITY = 7.5  # g/m3
DEFAULT_PRESSURE_HPA = 1013.25
FSPL_CONST_4PI_OVER_C_DB = 20 * math.log10(4 * math.pi / SPEED_OF_LIGHT)  # meters/Hz form

_loader = None
_timescale = None
if Loader:
    try:
        _loader = Loader("~/.skyfield-data")
        _timescale = _loader.timescale()
    except Exception:  # pragma: no cover
        _loader = None
        _timescale = None


def estimate_slant_range_km(
    ground_lat_deg: float,
    ground_lon_deg: float,
    ground_alt_m: float,
    sat_longitude_deg: float,
) -> float:
    """
    Estimate GEO slant range. Prefer Skyfield geometry; fall back to spherical geometry.
    """
    if wgs84 and _timescale:
        try:
            site = wgs84.latlon(ground_lat_deg, ground_lon_deg, elevation_m=ground_alt_m)
            sat = wgs84.latlon(0.0, sat_longitude_deg, elevation_m=GEO_ALTITUDE_KM * 1000)
            t = _timescale.now()
            return site.at(t).distance_to(sat.at(t)).km
        except Exception:
            pass

    lat_rad = math.radians(ground_lat_deg)
    delta_lon_rad = math.radians(sat_longitude_deg - ground_lon_deg)
    central_angle = math.acos(max(-1.0, min(1.0, math.cos(lat_rad) * math.cos(delta_lon_rad))))
    r_e = EARTH_RADIUS_KM + (ground_alt_m / 1000)
    r_s = EARTH_RADIUS_KM + GEO_ALTITUDE_KM
    return math.sqrt(r_e**2 + r_s**2 - 2 * r_e * r_s * math.cos(central_angle))


def free_space_path_loss_db(frequency_hz: float, distance_km: float) -> float:
    """FSPL = 20 log10(d) + 20 log10(f) + 20 log10(4π/c).

    Uses distance in meters and frequency in Hz to keep the physical form explicit.
    """
    d_m = max(distance_km * 1000.0, 1e-3)
    return 20 * math.log10(d_m) + 20 * math.log10(frequency_hz) + FSPL_CONST_4PI_OVER_C_DB


def rain_loss_db(
    rain_rate_mm_per_hr: float,
    elevation_deg: float,
    ground_lat_deg: float,
    ground_lon_deg: float,
    ground_alt_m: float,
    frequency_hz: float,
) -> float:
    if rain_rate_mm_per_hr <= 0:
        return 0.0
    try:
        return float(
            itu618.rain_attenuation(
                ground_lat_deg,
                ground_lon_deg,
                frequency_hz / 1e9,
                elevation_deg,
                hs=ground_alt_m / 1000,
                R001=rain_rate_mm_per_hr,
            ).value,
        )
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Failed to compute rain attenuation via ITU-R P.618") from exc


def gas_loss_db(
    frequency_hz: float,
    elevation_deg: float,
    temperature_k: float,
    water_vapor_density: float = DEFAULT_WATER_VAPOR_DENSITY,
    pressure_hpa: float = DEFAULT_PRESSURE_HPA,
) -> float:
    try:
        return float(
            itu676.gaseous_attenuation_slant_path(
                frequency_hz / 1e9,
                elevation_deg,
                rho=water_vapor_density,
                P=pressure_hpa,
                T=temperature_k,
                mode="approx",
            ).value,
        )
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Failed to compute gaseous attenuation via ITU-R P.676") from exc


def cloud_loss_db(
    ground_lat_deg: float,
    ground_lon_deg: float,
    elevation_deg: float,
    frequency_hz: float,
    availability_p: float = 0.01,
) -> float:
    try:
        return float(
            itu840.cloud_attenuation(
                ground_lat_deg,
                ground_lon_deg,
                elevation_deg,
                frequency_hz / 1e9,
                availability_p,
            ).value,
        )
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Failed to compute cloud attenuation via ITU-R P.840") from exc


def pointing_loss_db(elevation_deg: float) -> float:
    return 0.1 if elevation_deg > 20 else 0.5


@dataclass
class LinkBudgetInputs:
    frequency_hz: float
    bandwidth_hz: float
    elevation_deg: float
    rain_rate_mm_per_hr: float
    tx_eirp_dbw: float
    rx_gt_db_per_k: float
    ground_lat_deg: float
    ground_lon_deg: float
    ground_alt_m: float
    sat_longitude_deg: float
    temperature_k: float
    water_vapor_density: float = DEFAULT_WATER_VAPOR_DENSITY
    pressure_hpa: float = DEFAULT_PRESSURE_HPA


def compute_link_budget(inputs: LinkBudgetInputs) -> dict:
    slant_range_km = estimate_slant_range_km(
        inputs.ground_lat_deg,
        inputs.ground_lon_deg,
        inputs.ground_alt_m,
        inputs.sat_longitude_deg,
    )
    fspl = free_space_path_loss_db(inputs.frequency_hz, slant_range_km)
    rain = rain_loss_db(
        inputs.rain_rate_mm_per_hr,
        inputs.elevation_deg,
        inputs.ground_lat_deg,
        inputs.ground_lon_deg,
        inputs.ground_alt_m,
        inputs.frequency_hz,
    )
    gas = gas_loss_db(
        inputs.frequency_hz,
        inputs.elevation_deg,
        inputs.temperature_k,
        inputs.water_vapor_density,
        inputs.pressure_hpa,
    )
    cloud = cloud_loss_db(
        inputs.ground_lat_deg,
        inputs.ground_lon_deg,
        inputs.elevation_deg,
        inputs.frequency_hz,
    )
    pointing = pointing_loss_db(inputs.elevation_deg)
    atm_loss = fspl + rain + gas + cloud + pointing

    # C/N0 = EIRP - losses + G/T - k  (k is negative in dBW/K/Hz, so subtract to add its magnitude)
    cn0 = inputs.tx_eirp_dbw + inputs.rx_gt_db_per_k - atm_loss - KB
    cn = cn0 - 10 * math.log10(inputs.bandwidth_hz)
    # Margin is applied later against ModCod thresholds; here we only return C/N as-is.
    link_margin = cn

    for value in (fspl, rain, gas, cloud, pointing, atm_loss, cn0, cn):
        if not math.isfinite(value):
            raise ValueError("Non-finite propagation result; check geometry and elevation")

    return {
        "fspl_db": fspl,
        "rain_loss_db": rain,
        "gas_loss_db": gas,
        "cloud_loss_db": cloud,
        "atm_loss_db": atm_loss,
        "antenna_pointing_loss_db": pointing,
        "gt_db_per_k": inputs.rx_gt_db_per_k,
        "cn0_dbhz": cn0,
        "cn_db": cn,
        "link_margin_db": link_margin,
    }
