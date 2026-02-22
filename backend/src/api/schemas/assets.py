from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field
from pydantic.config import ConfigDict


class SatelliteBase(BaseModel):
    name: str
    description: str | None = None
    orbit_type: str = Field(default="GEO")
    longitude_deg: float | None = None
    inclination_deg: float | None = None
    altitude_km: float | None = Field(
        default=None,
        gt=0,
        description="Orbital altitude in km (e.g. 550 for LEO, 35786 for GEO)",
    )
    tle_line1: str | None = Field(
        default=None,
        max_length=80,
        description="TLE line 1 for orbit propagation (LEO/MEO)",
    )
    tle_line2: str | None = Field(
        default=None,
        max_length=80,
        description="TLE line 2 for orbit propagation (LEO/MEO)",
    )
    transponder_bandwidth_mhz: float | None = Field(
        default=None,
        description="Physical limit for validation against runtime signal bandwidth",
    )
    eirp_dbw: float | None = None
    gt_db_per_k: float | None = None
    frequency_band: str | None = None
    notes: str | None = None


class SatelliteCreate(SatelliteBase):
    pass


class SatelliteRead(SatelliteBase):
    id: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class EarthStationBase(BaseModel):
    name: str
    description: str | None = None
    antenna_diameter_m: float | None = Field(
        default=None,
        description="Used for future beamwidth/interference calculations",
    )
    antenna_gain_tx_db: float | None = Field(
        default=None,
        description="Tx Antenna Gain; used for EIRP calculation",
    )
    antenna_gain_rx_db: float | None = Field(
        default=None,
        description="Rx Antenna Gain; used for G/T calculation",
    )
    noise_temperature_k: float | None = Field(
        default=None,
        description="System Noise Temperature (K); used for G/T calculation",
    )
    eirp_dbw: float | None = Field(
        default=None,
        description="Total radiated power; if null, computed from TX Power + Gain",
    )
    tx_power_dbw: float | None = Field(
        default=None,
        description="Amplifier output power; used with Gain to calculate EIRP",
    )
    gt_db_per_k: float | None = None
    polarization: str | None = Field(
        default=None,
        description="Polarization (e.g. Linear/Circular) for interference checks",
    )
    latitude_deg: float | None = Field(
        default=None,
        ge=-90,
        le=90,
        description="Default ground station latitude (degrees)",
    )
    longitude_deg: float | None = Field(
        default=None,
        ge=-180,
        le=180,
        description="Default ground station longitude (degrees)",
    )
    altitude_m: float | None = Field(
        default=None,
        description="Default ground station altitude (metres above sea level)",
    )
    notes: str | None = None

    model_config = ConfigDict(extra="forbid")


class EarthStationCreate(EarthStationBase):
    pass


class EarthStationRead(EarthStationBase):
    id: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
