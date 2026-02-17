"""Human-in-the-loop node for user confirmations."""

from ntn_agents.state import LinkBudgetState
from ntn_agents.tools.assets import create_earth_station, create_satellite


async def human_node(state: LinkBudgetState) -> LinkBudgetState:
    """Handle human-in-the-loop interactions.

    This node:
    1. Presents confirmation messages to the user
    2. Processes user responses
    3. Executes approved actions (e.g., asset creation)

    In a real implementation, this would integrate with a UI or
    messaging system. For now, it processes the user_response field.

    Args:
        state: Current workflow state

    Returns:
        Updated state based on user response
    """
    confirmation_type = state.get("confirmation_type")
    user_response = state.get("user_response", "")
    proposed_assets = state.get("proposed_assets", [])

    # If no user response yet, return state as-is (waiting for input)
    if not user_response:
        return state

    # Process response
    response_lower = user_response.lower().strip()

    if response_lower in ("yes", "y", "ok", "proceed", "create"):
        # User approved - create proposed assets
        if confirmation_type == "asset_creation" and proposed_assets:
            resolved = dict(state.get("resolved_assets", {}))
            errors = []

            for asset in proposed_assets:
                asset_type = asset.get("type")

                try:
                    if asset_type == "satellite":
                        result = await create_satellite.ainvoke({
                            "name": asset.get("name", "New Satellite"),
                            "orbit_type": asset.get("orbit_type", "GEO"),
                            "longitude_deg": asset.get("longitude_deg", 128.0),
                            "frequency_band": asset.get("frequency_band", "Ku"),
                            "eirp_dbw": asset.get("eirp_dbw", 50.0),
                            "gt_db_per_k": asset.get("gt_db_per_k", 20.0),
                            "transponder_bandwidth_mhz": asset.get(
                                "transponder_bandwidth_mhz", 36.0
                            ),
                            "notes": "Created by NTN Agent",
                        })
                        resolved["satellite_id"] = result["id"]
                        resolved["satellite_name"] = result["name"]

                    elif asset_type == "earth_station":
                        result = await create_earth_station.ainvoke({
                            "name": asset.get("name", "New Station"),
                            "latitude_deg": asset.get("latitude_deg", 0.0),
                            "longitude_deg": asset.get("longitude_deg", 0.0),
                            "altitude_m": asset.get("altitude_m", 0.0),
                            "antenna_diameter_m": asset.get("antenna_diameter_m", 1.2),
                            "tx_power_dbw": asset.get("tx_power_dbw", 10.0),
                            "polarization": asset.get("polarization", "RHCP"),
                            "notes": "Created by NTN Agent",
                        })
                        # Use for both TX and RX
                        resolved["earth_station_tx_id"] = result["id"]
                        resolved["earth_station_tx_name"] = result["name"]
                        resolved["earth_station_rx_id"] = result["id"]
                        resolved["earth_station_rx_name"] = result["name"]

                except Exception as e:
                    errors.append(f"Failed to create {asset_type}: {e}")

            # Check if we're now ready
            assets_ready = all(
                key in resolved
                for key in ["satellite_id", "earth_station_tx_id", "earth_station_rx_id"]
            )

            return {
                **state,
                "resolved_assets": resolved,
                "assets_ready": assets_ready,
                "proposed_assets": [],
                "awaiting_confirmation": False,
                "confirmation_type": None,
                "user_response": None,
                "warnings": state.get("warnings", []) + errors if errors else state.get("warnings", []),
            }

        elif confirmation_type == "proceed":
            return {
                **state,
                "awaiting_confirmation": False,
                "confirmation_type": None,
                "user_response": None,
            }

    elif response_lower in ("no", "n", "cancel", "stop"):
        # User rejected
        return {
            **state,
            "awaiting_confirmation": False,
            "confirmation_type": None,
            "user_response": "cancel",
            "warnings": state.get("warnings", []) + ["User cancelled the operation."],
        }

    else:
        # Try to parse as parameter modifications
        # e.g., "yes, but change EIRP to 55 dBW"
        if "yes" in response_lower or "ok" in response_lower:
            # Parse modifications from response
            modifications = _parse_modifications(user_response)

            if modifications:
                # Apply modifications to proposed assets
                updated_assets = []
                for asset in proposed_assets:
                    updated = dict(asset)
                    updated.update(modifications.get(asset.get("type", ""), {}))
                    updated_assets.append(updated)

                return {
                    **state,
                    "proposed_assets": updated_assets,
                    "confirmation_message": _build_confirmation_message(updated_assets),
                    "user_response": None,  # Ask again with modified values
                }

        # Unclear response
        return {
            **state,
            "confirmation_message": state.get("confirmation_message", "")
            + "\n\nPlease respond with 'yes' to proceed or 'no' to cancel.",
            "user_response": None,
        }

    return state


def _parse_modifications(response: str) -> dict:
    """Parse parameter modifications from user response."""
    import re

    modifications: dict = {"satellite": {}, "earth_station": {}}

    # Pattern for EIRP
    eirp_match = re.search(r"eirp[:\s]*(\d+\.?\d*)", response, re.IGNORECASE)
    if eirp_match:
        modifications["satellite"]["eirp_dbw"] = float(eirp_match.group(1))

    # Pattern for G/T
    gt_match = re.search(r"g/?t[:\s]*(\d+\.?\d*)", response, re.IGNORECASE)
    if gt_match:
        modifications["satellite"]["gt_db_per_k"] = float(gt_match.group(1))

    # Pattern for antenna diameter
    dia_match = re.search(r"diameter[:\s]*(\d+\.?\d*)", response, re.IGNORECASE)
    if dia_match:
        modifications["earth_station"]["antenna_diameter_m"] = float(dia_match.group(1))

    # Pattern for TX power
    power_match = re.search(r"power[:\s]*(\d+\.?\d*)", response, re.IGNORECASE)
    if power_match:
        modifications["earth_station"]["tx_power_dbw"] = float(power_match.group(1))

    # Return only if we found modifications
    has_mods = any(modifications[k] for k in modifications)
    return modifications if has_mods else {}


def _build_confirmation_message(proposed: list[dict]) -> str:
    """Build a human-readable confirmation message for proposed assets."""
    lines = ["The following assets will be created with updated values:"]

    for asset in proposed:
        asset_type = asset.get("type", "unknown")
        name = asset.get("name", "unnamed")

        if asset_type == "satellite":
            lon = asset.get("longitude_deg", 0)
            band = asset.get("frequency_band", "unknown")
            eirp = asset.get("eirp_dbw", 0)
            lines.append(f"  - Satellite: {name} at {lon}°E ({band}-band, EIRP={eirp} dBW)")

        elif asset_type == "earth_station":
            lat = asset.get("latitude_deg", 0)
            lon = asset.get("longitude_deg", 0)
            dia = asset.get("antenna_diameter_m", 0)
            lines.append(
                f"  - Earth Station: {name} at ({lat:.2f}°, {lon:.2f}°), "
                f"antenna {dia}m"
            )

    lines.append("\nProceed with creation? (yes/no)")

    return "\n".join(lines)
