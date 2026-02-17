"""Calculator node for executing link budget calculations."""

from ntn_agents.state import CalculationResult, LinkBudgetState
from ntn_agents.tools.link_budget import calculate_link_budget


async def calculator_node(state: LinkBudgetState) -> LinkBudgetState:
    """Execute the link budget calculation using resolved assets.

    This node:
    1. Builds the calculation request from resolved assets and parameters
    2. Calls the backend API to perform the calculation
    3. Extracts key results for analysis

    Args:
        state: Current workflow state with resolved_assets

    Returns:
        Updated state with calculation_result
    """
    params = state.get("extracted_params", {})
    assets = state.get("resolved_assets", {})

    # Validate we have required assets
    satellite_id = assets.get("satellite_id")
    tx_id = assets.get("earth_station_tx_id")
    rx_id = assets.get("earth_station_rx_id")
    modcod_id = assets.get("modcod_table_id")

    if not all([satellite_id, tx_id, rx_id]):
        return {
            **state,
            "calculation_error": "Missing required assets for calculation",
        }

    # Build calculation parameters
    sat_longitude = params.get("sat_longitude_deg", 128.0)
    ground_lat = params.get("ground_lat_deg", 35.6762)
    ground_lon = params.get("ground_lon_deg", 139.6503)
    ground_alt = params.get("ground_alt_m", 0.0)

    # Frequency parameters
    uplink_freq = params.get("uplink_frequency_hz", 14.25e9)
    downlink_freq = params.get("downlink_frequency_hz", 12.45e9)
    bandwidth = params.get("bandwidth_hz", 36e6)

    # Environmental parameters
    rain_rate = params.get("rain_rate_mm_per_hr", 30.0)
    temperature = params.get("temperature_k", 290.0)

    # Transponder type
    transponder_type = params.get("transponder_type", "TRANSPARENT")

    try:
        # Call the calculation tool
        result = await calculate_link_budget.ainvoke({
            "satellite_id": satellite_id,
            "earth_station_tx_id": tx_id,
            "earth_station_rx_id": rx_id,
            "modcod_table_id": modcod_id,
            "sat_longitude_deg": sat_longitude,
            "uplink_frequency_hz": uplink_freq,
            "uplink_bandwidth_hz": bandwidth,
            "uplink_elevation_deg": 45.0,  # Will be computed by backend
            "uplink_rain_rate_mm_per_hr": rain_rate,
            "uplink_temperature_k": temperature,
            "uplink_ground_lat_deg": ground_lat,
            "uplink_ground_lon_deg": ground_lon,
            "uplink_ground_alt_m": ground_alt,
            "downlink_frequency_hz": downlink_freq,
            "downlink_bandwidth_hz": bandwidth,
            "downlink_elevation_deg": 45.0,  # Will be computed by backend
            "downlink_rain_rate_mm_per_hr": rain_rate,
            "downlink_temperature_k": temperature,
            "downlink_ground_lat_deg": ground_lat,
            "downlink_ground_lon_deg": ground_lon,
            "downlink_ground_alt_m": ground_alt,
            "transponder_type": transponder_type,
            "rolloff": 0.2,
            "include_snapshot": True,
        })

        # Extract results into our structure
        calc_result = _extract_result(result)

        return {
            **state,
            "calculation_result": calc_result,
            "calculation_error": None,
        }

    except Exception as e:
        return {
            **state,
            "calculation_error": str(e),
        }


def _extract_result(api_result: dict) -> CalculationResult:
    """Extract structured result from API response."""
    result: CalculationResult = {}

    # Uplink results
    uplink = api_result.get("uplink", {})
    if uplink:
        result["uplink_fspl_db"] = uplink.get("fspl_db")
        result["uplink_rain_loss_db"] = uplink.get("rain_loss_db")
        result["uplink_gas_loss_db"] = uplink.get("gas_loss_db")
        result["uplink_cloud_loss_db"] = uplink.get("cloud_loss_db")
        result["uplink_cn0_dbhz"] = uplink.get("cn0_dbhz")
        result["uplink_cn_db"] = uplink.get("cn_db")
        result["uplink_margin_db"] = uplink.get("link_margin_db")

    # Downlink results
    downlink = api_result.get("downlink", {})
    if downlink:
        result["downlink_fspl_db"] = downlink.get("fspl_db")
        result["downlink_rain_loss_db"] = downlink.get("rain_loss_db")
        result["downlink_gas_loss_db"] = downlink.get("gas_loss_db")
        result["downlink_cloud_loss_db"] = downlink.get("cloud_loss_db")
        result["downlink_cn0_dbhz"] = downlink.get("cn0_dbhz")
        result["downlink_cn_db"] = downlink.get("cn_db")
        result["downlink_margin_db"] = downlink.get("link_margin_db")

    # Combined results (for transparent transponder)
    result["combined_cn0_dbhz"] = api_result.get("combined_cn0_dbhz")
    result["combined_cn_db"] = api_result.get("combined_cn_db")
    result["combined_margin_db"] = api_result.get("combined_margin_db")

    # ModCod selection
    result["modcod_selected"] = api_result.get("modcod_selected")
    result["waveform_strategy"] = api_result.get("waveform_strategy")
    result["transponder_type"] = api_result.get("transponder_type")

    return result
