from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator
from pydantic.config import ConfigDict


class WaveformStrategy(str, Enum):
    DVB_S2X = "DVB_S2X"


class TransponderType(str, Enum):
    TRANSPARENT = "TRANSPARENT"
    REGENERATIVE = "REGENERATIVE"

class InterferenceModel(BaseModel):
    adjacent_sat_ci_db: float | None = None
    cross_polar_ci_db: float | None = None
    other_carrier_ci_db: float | None = None
    applied: bool = False
    notes: str | None = None

    model_config = ConfigDict(extra="forbid")


class IntermodulationModel(BaseModel):
    input_backoff_db: float | None = Field(default=None, ge=0)
    output_backoff_db: float | None = Field(default=None, ge=0)
    saturation_power_dbw: float | None = None
    composite_carriers: int | None = Field(default=None, ge=1)
    reference_bandwidth_hz: float | None = Field(default=None, gt=0)
    applied: bool = False
    notes: str | None = None

    model_config = ConfigDict(extra="forbid")


class DirectionRuntimeParametersModel(BaseModel):
    frequency_hz: float = Field(gt=0)
    bandwidth_hz: float | None = Field(default=None, gt=0)
    elevation_deg: float | None = Field(default=None)
    rain_rate_mm_per_hr: float = Field(ge=0)
    temperature_k: float | None = Field(default=None, gt=0)
    pressure_hpa: float | None = Field(default=None, gt=0)
    water_vapor_density: float | None = Field(default=None, ge=0)
    ground_lat_deg: float = Field(ge=-90, le=90)
    ground_lon_deg: float = Field(ge=-180, le=180)
    ground_alt_m: float | None = Field(default=0)
    interference: InterferenceModel | None = None

    model_config = ConfigDict(extra="forbid")


class RuntimeParametersModel(BaseModel):
    sat_longitude_deg: float | None = Field(default=None, ge=-180, le=180)
    bandwidth_hz: float | None = Field(default=None, gt=0)
    rolloff: float | None = Field(default=None, ge=0)
    uplink: DirectionRuntimeParametersModel
    downlink: DirectionRuntimeParametersModel
    intermodulation: IntermodulationModel | None = None

    model_config = ConfigDict(extra="forbid")


class SatelliteOverrides(BaseModel):
    eirp_dbw: float | None = None
    gt_db_per_k: float | None = None

    model_config = ConfigDict(extra="forbid")


class CalculationOverrides(BaseModel):
    satellite: SatelliteOverrides | None = None

    model_config = ConfigDict(extra="forbid")


class ModcodEntryModel(BaseModel):
    id: str
    modulation: str
    code_rate: str
    required_ebno_db: float | None = None
    required_cn0_dbhz: float | None = None
    info_bits_per_symbol: float
    rolloff: float | None = None
    pilots: bool | None = None


class CalculationResultModel(BaseModel):
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
    cni_db: float | None = None
    cni0_dbhz: float | None = None
    c_im_db: float | None = None
    interference_applied: bool = False
    intermod_applied: bool = False
    warnings: list[str] | None = None


class CombinedCalculationResultModel(BaseModel):
    cn_db: float
    cn0_dbhz: float
    cni_db: float | None = None
    cni0_dbhz: float | None = None
    c_im_db: float | None = None
    link_margin_db: float | None = None
    clean_link_margin_db: float | None = None
    clean_cn_db: float | None = None


class CalculationResults(BaseModel):
    uplink: CalculationResultModel
    downlink: CalculationResultModel
    combined: CombinedCalculationResultModel | None = None


class StrategySnapshot(BaseModel):
    waveform_strategy: WaveformStrategy
    transponder_type: TransponderType


class SatelliteSnapshot(BaseModel):
    id: UUID | None = None
    name: str | None = None
    description: str | None = None
    orbit_type: str | None = None
    longitude_deg: float | None = None
    inclination_deg: float | None = None
    transponder_bandwidth_mhz: float | None = None
    eirp_dbw: float | None = None
    gt_db_per_k: float | None = None
    frequency_band: str | None = None
    notes: str | None = None


class EarthStationSnapshot(BaseModel):
    id: UUID | None = None
    name: str | None = None
    description: str | None = None
    antenna_diameter_m: float | None = None
    antenna_gain_db: float | None = None
    eirp_dbw: float | None = None
    tx_power_dbw: float | None = None
    gt_db_per_k: float | None = None
    polarization: str | None = None
    notes: str | None = None


class EntitySnapshot(BaseModel):
    satellite: SatelliteSnapshot | None = None
    earth_station_tx: EarthStationSnapshot | None = None
    earth_station_rx: EarthStationSnapshot | None = None


class StaticSnapshot(BaseModel):
    modcod_table_id: UUID | str | None = None
    modcod_table_version: str | None = None
    modcod_entries: list[ModcodEntryModel] | None = None
    uplink_modcod_table_id: UUID | str | None = None
    uplink_modcod_table_version: str | None = None
    uplink_modcod_entries: list[ModcodEntryModel] | None = None
    downlink_modcod_table_id: UUID | str | None = None
    downlink_modcod_table_version: str | None = None
    downlink_modcod_entries: list[ModcodEntryModel] | None = None
    itu_constants: dict[str, Any] = Field(default_factory=dict)


class ScenarioMetadata(BaseModel):
    schema_version: str = "1.1.0"
    computed_at: datetime | None = None
    modcod_table_id: UUID | str | None = None
    modcod_table_version: str | None = None
    uplink_modcod_table_id: UUID | str | None = None
    downlink_modcod_table_id: UUID | str | None = None
    satellite_id: UUID | str | None = None
    earth_station_tx_id: UUID | str | None = None
    earth_station_rx_id: UUID | str | None = None


class ScenarioPayload(BaseModel):
    static: StaticSnapshot = Field(default_factory=StaticSnapshot)
    entity: EntitySnapshot = Field(default_factory=EntitySnapshot)
    runtime: RuntimeParametersModel
    strategy: StrategySnapshot
    metadata: ScenarioMetadata = Field(default_factory=ScenarioMetadata)
    overrides: CalculationOverrides | None = None

    model_config = ConfigDict(extra="forbid")


class CalculationRequest(BaseModel):
    waveform_strategy: WaveformStrategy
    transponder_type: TransponderType
    modcod_table_id: UUID | None = None
    uplink_modcod_table_id: UUID | None = None
    downlink_modcod_table_id: UUID | None = None
    satellite_id: UUID
    earth_station_tx_id: UUID | None = None
    earth_station_rx_id: UUID | None = None
    runtime: RuntimeParametersModel
    overrides: CalculationOverrides | None = None
    include_snapshot: bool = False

    @model_validator(mode="after")
    def validate_modcod_tables(self):
        if self.transponder_type == TransponderType.TRANSPARENT:
            if self.modcod_table_id is None:
                raise ValueError("modcod_table_id is required for Transparent transponders")
            if (
                self.uplink_modcod_table_id
                and self.uplink_modcod_table_id != self.modcod_table_id
            ):
                raise ValueError("Transparent transponders use a single ModCod table")
            if (
                self.downlink_modcod_table_id
                and self.downlink_modcod_table_id != self.modcod_table_id
            ):
                raise ValueError("Transparent transponders use a single ModCod table")
        else:
            if self.uplink_modcod_table_id is None or self.downlink_modcod_table_id is None:
                raise ValueError("uplink/downlink ModCod ids required for Regenerative")
            if self.modcod_table_id is None:
                self.modcod_table_id = self.uplink_modcod_table_id
        return self


DirectionRuntimeParametersModel.model_rebuild()
RuntimeParametersModel.model_rebuild()
CalculationRequest.model_rebuild()


class SelectedModcod(BaseModel):
    id: str
    modulation: str | None = None
    code_rate: str | None = None
    required_ebno_db: float | None = None
    required_cn0_dbhz: float | None = None
    info_bits_per_symbol: float | None = None
    effective_spectral_efficiency: float | None = None
    rolloff: float | None = None
    pilots: bool | None = None


class SelectedModcodByDirection(BaseModel):
    uplink: SelectedModcod | None = None
    downlink: SelectedModcod | None = None


class CalculationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    schema_version: str
    strategy: StrategySnapshot
    results: CalculationResults
    combined_link_margin_db: float | None = None
    combined_cn_db: float | None = None
    combined_cn0_dbhz: float | None = None
    modcod_selected: SelectedModcod | SelectedModcodByDirection | None
    runtime_echo: RuntimeParametersModel
    payload_snapshot: ScenarioPayload | None = Field(
        validation_alias="snapshot",
        serialization_alias="payload_snapshot",
        default=None,
    )
