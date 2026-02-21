from dataclasses import dataclass

from src.core.models.common import CalculationResult, LinkDirectionParameters, RuntimeParameters
from src.core.propagation import (
    DEFAULT_PRESSURE_HPA,
    DEFAULT_WATER_VAPOR_DENSITY,
    LinkBudgetInputs,
    compute_link_budget,
)
from src.core.strategies.dvbs2x import DvbS2xStrategy


@dataclass
class CommunicationContext:
    uplink_tx_eirp_dbw: float = 50.0
    uplink_rx_gt_db_per_k: float = 20.0
    downlink_tx_eirp_dbw: float = 50.0
    downlink_rx_gt_db_per_k: float = 25.0


class TransparentCommunicationStrategy:
    name = "TRANSPARENT"

    def __init__(self, waveform: DvbS2xStrategy, context: CommunicationContext | None = None):
        self.waveform = waveform
        self.context = context or CommunicationContext()

    async def calculate(
        self,
        runtime: RuntimeParameters,
        direction: str = "uplink",
    ) -> CalculationResult:
        is_uplink = direction == "uplink"
        params: LinkDirectionParameters = runtime.uplink if is_uplink else runtime.downlink
        tx_eirp = (
            self.context.uplink_tx_eirp_dbw if is_uplink else self.context.downlink_tx_eirp_dbw
        )
        rx_gt = (
            self.context.uplink_rx_gt_db_per_k
            if is_uplink
            else self.context.downlink_rx_gt_db_per_k
        )

        inputs = LinkBudgetInputs(
            frequency_hz=params.frequency_hz,
            bandwidth_hz=params.bandwidth_hz,
            elevation_deg=params.elevation_deg,
            rain_rate_mm_per_hr=params.rain_rate_mm_per_hr,
            tx_eirp_dbw=tx_eirp,
            rx_gt_db_per_k=rx_gt,
            ground_lat_deg=params.ground_lat_deg,
            ground_lon_deg=params.ground_lon_deg,
            ground_alt_m=params.ground_alt_m,
            sat_longitude_deg=runtime.sat_longitude_deg,
            temperature_k=params.temperature_k,
            water_vapor_density=(
                params.water_vapor_density
                if params.water_vapor_density is not None
                else DEFAULT_WATER_VAPOR_DENSITY
            ),
            pressure_hpa=(
                params.pressure_hpa if params.pressure_hpa is not None else DEFAULT_PRESSURE_HPA
            ),
        )
        stats = compute_link_budget(inputs)
        return CalculationResult(
            direction=direction,
            modcod_selected=None,
            eirp_dbw=inputs.tx_eirp_dbw,
            bandwidth_hz=params.bandwidth_hz,
            **stats,
        )
