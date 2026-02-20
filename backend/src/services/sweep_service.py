import copy
import logging
from typing import Any

from fastapi import HTTPException

from src.api.schemas.sweep import (
    SWEEPABLE_PARAMETERS,
    SweepConfig,
    SweepPoint,
    SweepResponse,
)
from src.persistence.repositories.assets import EarthStationRepository, SatelliteRepository
from src.persistence.repositories.modcod import ModcodRepository
from src.services.calculation_service import CalculationService

logger = logging.getLogger(__name__)


def set_nested_value(obj: dict[str, Any], path: str, value: float) -> None:
    """Set a value in a nested dict using dot-separated path.

    Creates intermediate dicts as needed (e.g. for overrides.satellite.eirp_dbw
    when overrides is None).
    """
    keys = path.split(".")
    current = obj
    for key in keys[:-1]:
        if current.get(key) is None:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value


def _extract_modcod_info(
    modcod_selected: Any,
) -> tuple[str | None, str | None]:
    """Extract modcod id and label from the calculation response."""
    if modcod_selected is None:
        return None, None
    if isinstance(modcod_selected, dict):
        modcod_id = modcod_selected.get("id")
        mod = modcod_selected.get("modulation", "")
        rate = modcod_selected.get("code_rate", "")
        label = f"{mod} {rate}".strip() if mod or rate else modcod_id
        return modcod_id, label
    return None, None


def _extract_sweep_point(
    result: dict[str, Any],
    sweep_value: float,
    threshold_db: float | None,
) -> SweepPoint:
    """Extract relevant metrics from a full calculation result."""
    ul = result.get("results", {}).get("uplink", {})
    dl = result.get("results", {}).get("downlink", {})
    combined_margin = result.get("combined_link_margin_db")
    viable = True
    if threshold_db is not None and combined_margin is not None:
        viable = combined_margin >= threshold_db

    modcod_id, modcod_label = _extract_modcod_info(result.get("modcod_selected"))

    return SweepPoint(
        sweep_value=sweep_value,
        combined_link_margin_db=combined_margin,
        combined_cn_db=result.get("combined_cn_db"),
        combined_cn0_dbhz=result.get("combined_cn0_dbhz"),
        uplink_cn_db=ul.get("cn_db"),
        uplink_rain_loss_db=ul.get("rain_loss_db"),
        uplink_link_margin_db=ul.get("link_margin_db"),
        downlink_cn_db=dl.get("cn_db"),
        downlink_rain_loss_db=dl.get("rain_loss_db"),
        downlink_link_margin_db=dl.get("link_margin_db"),
        modcod_id=modcod_id,
        modcod_label=modcod_label,
        viable=viable,
    )


def compute_crossover(
    points: list[SweepPoint],
    threshold_db: float | None,
) -> float | None:
    """Find the sweep value where link margin crosses the threshold via linear interpolation."""
    if threshold_db is None:
        return None

    for i in range(len(points) - 1):
        m1 = points[i].combined_link_margin_db
        m2 = points[i + 1].combined_link_margin_db
        if m1 is None or m2 is None:
            continue
        # Check if threshold is crossed between these two points
        if (m1 - threshold_db) * (m2 - threshold_db) < 0:
            # Linear interpolation
            v1 = points[i].sweep_value
            v2 = points[i + 1].sweep_value
            ratio = (threshold_db - m1) / (m2 - m1)
            return v1 + ratio * (v2 - v1)
    return None


class SweepService:
    def __init__(
        self,
        modcod_repo: ModcodRepository | None = None,
        satellite_repo: SatelliteRepository | None = None,
        earth_station_repo: EarthStationRepository | None = None,
    ):
        self.modcod_repo = modcod_repo
        self.satellite_repo = satellite_repo
        self.earth_station_repo = earth_station_repo

    async def execute(
        self,
        base_payload: dict[str, Any],
        sweep_config: SweepConfig,
        threshold_db: float | None,
    ) -> SweepResponse:
        steps = sweep_config.steps
        values = [
            sweep_config.start + i * (sweep_config.end - sweep_config.start) / (steps - 1)
            for i in range(steps)
        ]

        label, _, _ = SWEEPABLE_PARAMETERS[sweep_config.parameter_path]

        points: list[SweepPoint] = []
        for value in values:
            payload = copy.deepcopy(base_payload)
            set_nested_value(payload, sweep_config.parameter_path, value)

            # Create a fresh service for each point to avoid state contamination
            service = CalculationService(
                modcod_repo=self.modcod_repo,
                satellite_repo=self.satellite_repo,
                earth_station_repo=self.earth_station_repo,
            )

            try:
                result = await service.calculate(payload)
                point = _extract_sweep_point(result, value, threshold_db)
            except HTTPException as exc:
                point = SweepPoint(
                    sweep_value=value,
                    viable=False,
                    warnings=[exc.detail if isinstance(exc.detail, str) else str(exc.detail)],
                )
            except (ValueError, RuntimeError) as exc:
                point = SweepPoint(
                    sweep_value=value,
                    viable=False,
                    warnings=[str(exc)],
                )
            points.append(point)

        crossover = compute_crossover(points, threshold_db)

        strategy_snapshot = {
            "waveform_strategy": base_payload.get("waveform_strategy", "DVB_S2X"),
            "transponder_type": base_payload.get("transponder_type", "TRANSPARENT"),
        }

        return SweepResponse(
            sweep_parameter=sweep_config.parameter_path,
            sweep_label=label,
            threshold_db=threshold_db,
            points=points,
            crossover_value=crossover,
            strategy=strategy_snapshot,
        )
