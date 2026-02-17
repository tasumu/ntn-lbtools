"""Expert node for ITU-R based analysis and recommendations."""

from ntn_agents.knowledge.itu_r import explain_loss, get_recommendation_guidance
from ntn_agents.state import LinkBudgetState


async def expert_node(state: LinkBudgetState) -> LinkBudgetState:
    """Analyze calculation results with ITU-R expertise.

    This node:
    1. Explains each propagation loss component
    2. Identifies potential issues (low margin, high losses)
    3. Provides recommendations for improvement
    4. Adds ITU-R context to the results

    Args:
        state: Current workflow state with calculation_result

    Returns:
        Updated state with explanations and recommendations
    """
    result = state.get("calculation_result", {})
    params = state.get("extracted_params", {})
    explanations: list[str] = []
    recommendations: list[str] = []
    warnings: list[str] = []

    if not result:
        return {
            **state,
            "explanations": ["No calculation results available for analysis."],
            "recommendations": [],
            "warnings": ["Calculation may have failed. Check calculation_error."],
        }

    # Get frequency info for context
    uplink_freq = params.get("uplink_frequency_hz")
    downlink_freq = params.get("downlink_frequency_hz")
    freq_band = params.get("frequency_band", "Unknown")

    explanations.append(f"## Link Budget Analysis ({freq_band}-band)")

    # Analyze uplink
    explanations.append("\n### Uplink Analysis")

    uplink_fspl = result.get("uplink_fspl_db")
    if uplink_fspl:
        explanations.append(explain_loss("fspl", uplink_fspl, uplink_freq))

    uplink_rain = result.get("uplink_rain_loss_db")
    if uplink_rain:
        explanations.append(explain_loss("rain", uplink_rain, uplink_freq))
        if uplink_rain > 5:
            warnings.append(f"Uplink rain loss is high ({uplink_rain:.1f} dB)")

    uplink_gas = result.get("uplink_gas_loss_db")
    if uplink_gas:
        explanations.append(explain_loss("gas", uplink_gas, uplink_freq))

    uplink_margin = result.get("uplink_margin_db")
    if uplink_margin is not None:
        if uplink_margin < 0:
            warnings.append(f"Uplink margin is NEGATIVE ({uplink_margin:.1f} dB)")
            recommendations.append("Increase TX EIRP or reduce rain margin")
        elif uplink_margin < 3:
            warnings.append(f"Uplink margin is low ({uplink_margin:.1f} dB)")
            recommendations.append("Consider larger TX antenna or higher TX power")
        else:
            explanations.append(f"Uplink margin: {uplink_margin:.1f} dB (adequate)")

    # Analyze downlink
    explanations.append("\n### Downlink Analysis")

    downlink_fspl = result.get("downlink_fspl_db")
    if downlink_fspl:
        explanations.append(explain_loss("fspl", downlink_fspl, downlink_freq))

    downlink_rain = result.get("downlink_rain_loss_db")
    if downlink_rain:
        explanations.append(explain_loss("rain", downlink_rain, downlink_freq))
        if downlink_rain > 5:
            warnings.append(f"Downlink rain loss is high ({downlink_rain:.1f} dB)")

    downlink_margin = result.get("downlink_margin_db")
    if downlink_margin is not None:
        if downlink_margin < 0:
            warnings.append(f"Downlink margin is NEGATIVE ({downlink_margin:.1f} dB)")
            recommendations.append("Increase satellite EIRP or RX antenna gain")
        elif downlink_margin < 3:
            warnings.append(f"Downlink margin is low ({downlink_margin:.1f} dB)")
            recommendations.append("Consider larger RX antenna or lower ModCod")
        else:
            explanations.append(f"Downlink margin: {downlink_margin:.1f} dB (adequate)")

    # Analyze combined (for transparent transponder)
    combined_margin = result.get("combined_margin_db")
    if combined_margin is not None:
        explanations.append("\n### Combined Link Analysis")
        if combined_margin < 0:
            warnings.append(f"Combined margin is NEGATIVE ({combined_margin:.1f} dB)")
            recommendations.append("Link is not viable with current parameters")
        elif combined_margin < 3:
            warnings.append(f"Combined margin is low ({combined_margin:.1f} dB)")
            recommendations.append("May experience outages during rain events")
        else:
            explanations.append(f"Combined margin: {combined_margin:.1f} dB (adequate)")

    # ModCod analysis
    modcod = result.get("modcod_selected")
    if modcod:
        explanations.append(f"\n### ModCod Selection: {modcod}")
        explanations.append(
            "Selected based on available C/N0 and DVB-S2X thresholds."
        )

    # Add general recommendations based on band
    if freq_band.upper() == "KA":
        recommendations.append(
            "Ka-band is highly sensitive to rain. Consider ACM and site diversity."
        )
        guidance = get_recommendation_guidance("P.618", "high_loss")
        if "mitigations" in guidance:
            recommendations.extend(guidance["mitigations"][:2])

    elif freq_band.upper() == "KU":
        recommendations.append(
            "Ku-band requires moderate rain margin. Typical 3-10 dB fade margin."
        )

    # Determine if optimization should run
    target_margin = params.get("target_margin_db")
    should_optimize = False

    if target_margin is not None:
        if combined_margin is not None and combined_margin < target_margin:
            should_optimize = True
            recommendations.append(
                f"Current margin ({combined_margin:.1f} dB) "
                f"is below target ({target_margin:.1f} dB). "
                "Running optimization."
            )

    return {
        **state,
        "explanations": explanations,
        "recommendations": recommendations,
        "warnings": warnings,
        "should_optimize": should_optimize,
    }
