"""State definitions for the LangGraph link budget workflow."""

from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages


class ExtractedParams(TypedDict, total=False):
    """Parameters extracted from natural language request."""

    # Location
    ground_lat_deg: float
    ground_lon_deg: float
    ground_alt_m: float
    location_name: str

    # Satellite
    satellite_name: str
    sat_longitude_deg: float

    # Frequency
    frequency_band: str
    uplink_frequency_hz: float
    downlink_frequency_hz: float
    bandwidth_hz: float

    # Environmental
    rain_rate_mm_per_hr: float
    temperature_k: float
    availability_percent: float

    # Target
    target_margin_db: float
    target_data_rate_bps: float

    # Transponder
    transponder_type: Literal["TRANSPARENT", "REGENERATIVE"]


class ResolvedAssets(TypedDict, total=False):
    """Resolved asset IDs from database."""

    satellite_id: str
    satellite_name: str
    earth_station_tx_id: str
    earth_station_tx_name: str
    earth_station_rx_id: str
    earth_station_rx_name: str
    modcod_table_id: str
    modcod_table_name: str
    uplink_modcod_table_id: str
    downlink_modcod_table_id: str


class CalculationResult(TypedDict, total=False):
    """Link budget calculation result."""

    # Uplink
    uplink_fspl_db: float
    uplink_rain_loss_db: float
    uplink_gas_loss_db: float
    uplink_cloud_loss_db: float
    uplink_cn0_dbhz: float
    uplink_cn_db: float
    uplink_margin_db: float

    # Downlink
    downlink_fspl_db: float
    downlink_rain_loss_db: float
    downlink_gas_loss_db: float
    downlink_cloud_loss_db: float
    downlink_cn0_dbhz: float
    downlink_cn_db: float
    downlink_margin_db: float

    # Combined
    combined_cn0_dbhz: float
    combined_cn_db: float
    combined_margin_db: float

    # ModCod
    modcod_selected: str
    waveform_strategy: str
    transponder_type: str


class OptimizationResult(TypedDict, total=False):
    """Single optimization scenario result."""

    params: dict
    calculation: CalculationResult
    margin_db: float
    meets_target: bool


class LinkBudgetState(TypedDict, total=False):
    """Main state for the link budget workflow.

    This state is passed through all nodes in the LangGraph workflow.
    Each node can read and update relevant fields.
    """

    # Input
    messages: Annotated[list, add_messages]
    mode: Literal["design", "optimize", "consult"]
    original_request: str

    # Parse results
    extracted_params: ExtractedParams
    locations_resolved: bool
    parse_errors: list[str]

    # Asset resolution
    resolved_assets: ResolvedAssets
    assets_ready: bool
    missing_assets: list[str]
    proposed_assets: list[dict]

    # Calculation
    calculation_result: CalculationResult
    calculation_error: str | None

    # Expert analysis
    explanations: list[str]
    recommendations: list[str]
    warnings: list[str]

    # Optimization
    optimization_results: list[OptimizationResult]
    best_result: OptimizationResult | None

    # Human-in-the-loop
    awaiting_confirmation: bool
    confirmation_type: Literal["asset_creation", "parameter_confirmation", "proceed"] | None
    confirmation_message: str | None
    user_response: str | None

    # Control flow
    should_optimize: bool
    iteration_count: int
    max_iterations: int
