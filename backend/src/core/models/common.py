from __future__ import annotations

from dataclasses import dataclass


@dataclass
class LinkDirectionParameters:
    frequency_hz: float
    bandwidth_hz: float
    elevation_deg: float
    rain_rate_mm_per_hr: float
    temperature_k: float
    ground_lat_deg: float
    ground_lon_deg: float
    ground_alt_m: float = 0.0
    pressure_hpa: float | None = None
    water_vapor_density: float | None = None


@dataclass
class RuntimeParameters:
    sat_longitude_deg: float
    uplink: LinkDirectionParameters
    downlink: LinkDirectionParameters
    rolloff: float | None = None


@dataclass
class CalculationResult:
    direction: str
    fspl_db: float
    rain_loss_db: float
    gas_loss_db: float
    cloud_loss_db: float
    atm_loss_db: float
    antenna_pointing_loss_db: float
    gt_db_per_k: float
    cn_db: float
    cn0_dbhz: float
    link_margin_db: float
    clean_link_margin_db: float | None = None
    clean_cn_db: float | None = None
    modcod_selected: str | None = None
    eirp_dbw: float | None = None
    bandwidth_hz: float | None = None
    cni_db: float | None = None  # C/(N+I) after interference aggregation
    cni0_dbhz: float | None = None
    c_im_db: float | None = None  # C/IM estimate for intermodulation
    interference_applied: bool = False
    intermod_applied: bool = False
    warnings: list[str] | None = None
