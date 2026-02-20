from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from src.api.schemas.calculation import (
    CalculationRequest,
    StrategySnapshot,
)

# Allowlist of sweepable parameters: path -> (label, min_bound, max_bound)
SWEEPABLE_PARAMETERS: dict[str, tuple[str, float | None, float | None]] = {
    "runtime.uplink.rain_rate_mm_per_hr": ("Uplink Rain Rate (mm/hr)", 0, None),
    "runtime.downlink.rain_rate_mm_per_hr": ("Downlink Rain Rate (mm/hr)", 0, None),
    "runtime.uplink.frequency_hz": ("Uplink Frequency (Hz)", 1e6, None),
    "runtime.downlink.frequency_hz": ("Downlink Frequency (Hz)", 1e6, None),
    "runtime.bandwidth_hz": ("Channel Bandwidth (Hz)", 1e3, None),
    "runtime.uplink.bandwidth_hz": ("Uplink Bandwidth (Hz)", 1e3, None),
    "runtime.downlink.bandwidth_hz": ("Downlink Bandwidth (Hz)", 1e3, None),
    "runtime.uplink.elevation_deg": ("Uplink Elevation (deg)", 0, 90),
    "runtime.downlink.elevation_deg": ("Downlink Elevation (deg)", 0, 90),
    "runtime.uplink.ground_lat_deg": ("Uplink Ground Latitude (deg)", -90, 90),
    "runtime.downlink.ground_lat_deg": ("Downlink Ground Latitude (deg)", -90, 90),
    "runtime.sat_longitude_deg": ("Satellite Longitude (deg)", -180, 180),
    "overrides.satellite.eirp_dbw": ("Satellite EIRP (dBW)", None, None),
    "overrides.satellite.gt_db_per_k": ("Satellite G/T (dB/K)", None, None),
}


class SweepConfig(BaseModel):
    parameter_path: str
    start: float
    end: float
    steps: int = Field(ge=2, le=200)

    @model_validator(mode="after")
    def validate_sweep_config(self):
        if self.parameter_path not in SWEEPABLE_PARAMETERS:
            raise ValueError(
                f"Unsupported sweep parameter: {self.parameter_path}. "
                f"Allowed: {sorted(SWEEPABLE_PARAMETERS.keys())}",
            )
        if self.start == self.end:
            raise ValueError("start and end must differ")

        label, min_bound, max_bound = SWEEPABLE_PARAMETERS[self.parameter_path]
        for name, value in [("start", self.start), ("end", self.end)]:
            if min_bound is not None and value < min_bound:
                raise ValueError(f"{name} ({value}) is below minimum ({min_bound}) for {label}")
            if max_bound is not None and value > max_bound:
                raise ValueError(f"{name} ({value}) exceeds maximum ({max_bound}) for {label}")
        return self


class SweepRequest(BaseModel):
    base_request: CalculationRequest
    sweep: SweepConfig
    threshold_db: float | None = 3.0


class SweepPoint(BaseModel):
    sweep_value: float
    combined_link_margin_db: float | None = None
    combined_cn_db: float | None = None
    combined_cn0_dbhz: float | None = None
    uplink_cn_db: float | None = None
    uplink_rain_loss_db: float | None = None
    uplink_link_margin_db: float | None = None
    downlink_cn_db: float | None = None
    downlink_rain_loss_db: float | None = None
    downlink_link_margin_db: float | None = None
    modcod_id: str | None = None
    modcod_label: str | None = None
    viable: bool = True
    warnings: list[str] = Field(default_factory=list)


class SweepResponse(BaseModel):
    sweep_parameter: str
    sweep_label: str
    threshold_db: float | None = None
    points: list[SweepPoint]
    crossover_value: float | None = None
    strategy: StrategySnapshot
