"""Optimizer node for parameter exploration and optimization."""

from typing import Any

from ntn_agents.state import LinkBudgetState, OptimizationResult
from ntn_agents.tools.link_budget import calculate_link_budget


async def optimizer_node(state: LinkBudgetState) -> LinkBudgetState:
    """Optimize link parameters to achieve target specifications.

    This node:
    1. Identifies optimization targets (margin, data rate)
    2. Explores parameter variations
    3. Finds optimal configurations
    4. Compares trade-offs

    Args:
        state: Current workflow state

    Returns:
        Updated state with optimization_results
    """
    params = state.get("extracted_params", {})
    assets = state.get("resolved_assets", {})
    current_result = state.get("calculation_result", {})

    target_margin = params.get("target_margin_db")
    results: list[OptimizationResult] = []

    # Check iteration limit
    iteration = state.get("iteration_count", 0)
    max_iterations = state.get("max_iterations", 10)

    if iteration >= max_iterations:
        return {
            **state,
            "optimization_results": results,
            "warnings": state.get("warnings", [])
            + ["Optimization iteration limit reached."],
        }

    # Validate assets
    satellite_id = assets.get("satellite_id")
    tx_id = assets.get("earth_station_tx_id")
    rx_id = assets.get("earth_station_rx_id")
    modcod_id = assets.get("modcod_table_id")

    if not all([satellite_id, tx_id, rx_id]):
        return {
            **state,
            "optimization_results": [],
            "warnings": state.get("warnings", [])
            + ["Cannot optimize without resolved assets."],
        }

    # Get base parameters
    base_params = _get_base_params(params)

    # Define optimization strategies
    strategies = []

    if target_margin is not None:
        current_margin = current_result.get("combined_margin_db", 0)
        margin_gap = target_margin - current_margin

        if margin_gap > 0:
            # Need to increase margin
            strategies.extend([
                {
                    "name": "increase_bandwidth",
                    "description": "Reduce bandwidth to improve C/N",
                    "variations": [
                        {"bandwidth_hz": base_params["bandwidth_hz"] * 0.75},
                        {"bandwidth_hz": base_params["bandwidth_hz"] * 0.5},
                    ],
                },
                {
                    "name": "reduce_rain_rate",
                    "description": "Design for lower rain rate (higher availability)",
                    "variations": [
                        {"rain_rate_mm_per_hr": base_params["rain_rate_mm_per_hr"] * 0.5},
                        {"rain_rate_mm_per_hr": 10.0},
                    ],
                },
            ])

    # Run optimization scenarios
    for strategy in strategies:
        for variation in strategy["variations"]:
            try:
                modified_params = {**base_params, **variation}
                calc_result = await _run_calculation(
                    satellite_id,
                    tx_id,
                    rx_id,
                    modcod_id,
                    modified_params,
                )

                # Extract margin
                margin = calc_result.get("combined_margin_db")
                meets_target = (
                    margin is not None
                    and target_margin is not None
                    and margin >= target_margin
                )

                opt_result: OptimizationResult = {
                    "params": {
                        "strategy": strategy["name"],
                        "description": strategy["description"],
                        **variation,
                    },
                    "calculation": calc_result,
                    "margin_db": margin if margin is not None else 0,
                    "meets_target": meets_target,
                }

                results.append(opt_result)

            except Exception:
                continue

    # Find best result
    best_result = None
    if results:
        # Sort by margin (descending)
        sorted_results = sorted(
            results,
            key=lambda r: r.get("margin_db", float("-inf")),
            reverse=True,
        )

        # Prefer results that meet target
        meeting_target = [r for r in sorted_results if r.get("meets_target")]
        if meeting_target:
            best_result = meeting_target[0]
        else:
            best_result = sorted_results[0]

    return {
        **state,
        "optimization_results": results,
        "best_result": best_result,
        "iteration_count": iteration + 1,
    }


def _get_base_params(params: dict) -> dict[str, Any]:
    """Extract base calculation parameters."""
    return {
        "sat_longitude_deg": params.get("sat_longitude_deg", 128.0),
        "ground_lat_deg": params.get("ground_lat_deg", 35.6762),
        "ground_lon_deg": params.get("ground_lon_deg", 139.6503),
        "ground_alt_m": params.get("ground_alt_m", 0.0),
        "uplink_frequency_hz": params.get("uplink_frequency_hz", 14.25e9),
        "downlink_frequency_hz": params.get("downlink_frequency_hz", 12.45e9),
        "bandwidth_hz": params.get("bandwidth_hz", 36e6),
        "rain_rate_mm_per_hr": params.get("rain_rate_mm_per_hr", 30.0),
        "temperature_k": params.get("temperature_k", 290.0),
    }


async def _run_calculation(
    satellite_id: str,
    tx_id: str,
    rx_id: str,
    modcod_id: str | None,
    params: dict[str, Any],
) -> dict[str, Any]:
    """Run a single calculation with given parameters."""
    return await calculate_link_budget.ainvoke({
        "satellite_id": satellite_id,
        "earth_station_tx_id": tx_id,
        "earth_station_rx_id": rx_id,
        "modcod_table_id": modcod_id or "",
        "sat_longitude_deg": params["sat_longitude_deg"],
        "uplink_frequency_hz": params["uplink_frequency_hz"],
        "uplink_bandwidth_hz": params["bandwidth_hz"],
        "uplink_elevation_deg": 45.0,
        "uplink_rain_rate_mm_per_hr": params["rain_rate_mm_per_hr"],
        "uplink_temperature_k": params["temperature_k"],
        "uplink_ground_lat_deg": params["ground_lat_deg"],
        "uplink_ground_lon_deg": params["ground_lon_deg"],
        "uplink_ground_alt_m": params["ground_alt_m"],
        "downlink_frequency_hz": params["downlink_frequency_hz"],
        "downlink_bandwidth_hz": params["bandwidth_hz"],
        "downlink_elevation_deg": 45.0,
        "downlink_rain_rate_mm_per_hr": params["rain_rate_mm_per_hr"],
        "downlink_temperature_k": params["temperature_k"],
        "downlink_ground_lat_deg": params["ground_lat_deg"],
        "downlink_ground_lon_deg": params["ground_lon_deg"],
        "downlink_ground_alt_m": params["ground_alt_m"],
        "transponder_type": "TRANSPARENT",
        "rolloff": 0.2,
        "include_snapshot": False,
    })
