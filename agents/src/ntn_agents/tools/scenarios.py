"""Scenario management tools for LangChain agents."""

from typing import Any

import httpx
from langchain_core.tools import tool

from ntn_agents.config import settings
from ntn_agents.tools._validation import validate_uuid


@tool
async def list_scenarios(limit: int = 50) -> list[dict[str, Any]]:
    """List saved calculation scenarios.

    Scenarios store complete calculation snapshots for replay and comparison.

    Args:
        limit: Maximum number of scenarios to return (default 50)

    Returns:
        List of scenario dictionaries with id, name, description, and timestamps.
    """
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get(
            "/api/v1/scenarios",
            params={"limit": limit},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def get_scenario(scenario_id: str) -> dict[str, Any]:
    """Get a specific scenario with its full payload snapshot.

    Args:
        scenario_id: UUID of the scenario

    Returns:
        Scenario dictionary including payload_snapshot with all calculation inputs.
    """
    validate_uuid(scenario_id, "scenario_id")
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.get(
            f"/api/v1/scenarios/{scenario_id}",
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def create_scenario(
    name: str,
    description: str,
    payload_snapshot: dict[str, Any],
) -> dict[str, Any]:
    """Create a new scenario from a calculation snapshot.

    Args:
        name: Scenario name (e.g., "Tokyo-128E Ku-band baseline")
        description: Description of what this scenario represents
        payload_snapshot: Complete calculation payload to save

    Returns:
        Created scenario dictionary with assigned UUID.
    """
    payload = {
        "name": name,
        "description": description,
        "payload_snapshot": payload_snapshot,
    }

    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.post(
            "/api/v1/scenarios",
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def update_scenario(
    scenario_id: str,
    name: str | None = None,
    description: str | None = None,
    payload_snapshot: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Update an existing scenario.

    Args:
        scenario_id: UUID of the scenario to update
        name: New name (optional)
        description: New description (optional)
        payload_snapshot: New payload snapshot (optional)

    Returns:
        Updated scenario dictionary.
    """
    payload = {}
    if name is not None:
        payload["name"] = name
    if description is not None:
        payload["description"] = description
    if payload_snapshot is not None:
        payload["payload_snapshot"] = payload_snapshot

    validate_uuid(scenario_id, "scenario_id")
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.put(
            f"/api/v1/scenarios/{scenario_id}",
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


@tool
async def delete_scenario(scenario_id: str) -> dict[str, str]:
    """Delete a scenario.

    Args:
        scenario_id: UUID of the scenario to delete

    Returns:
        Confirmation message.
    """
    validate_uuid(scenario_id, "scenario_id")
    async with httpx.AsyncClient(base_url=settings.backend_api_url) as client:
        response = await client.delete(
            f"/api/v1/scenarios/{scenario_id}",
            timeout=10.0,
        )
        response.raise_for_status()
        return {"status": "deleted", "id": scenario_id}


@tool
async def compare_scenarios(
    scenario_ids: list[str],
) -> dict[str, Any]:
    """Compare multiple scenarios side by side.

    Fetches each scenario and extracts key metrics for comparison.

    Args:
        scenario_ids: List of scenario UUIDs to compare

    Returns:
        Comparison dictionary with scenarios and differences.
    """
    scenarios = []

    for scenario_id in scenario_ids:
        scenario = await get_scenario.ainvoke({"scenario_id": scenario_id})
        scenarios.append(scenario)

    # Extract key metrics for comparison
    comparison = {
        "scenarios": [],
        "metrics": {
            "uplink_margin_db": [],
            "downlink_margin_db": [],
            "combined_margin_db": [],
            "modcod_selected": [],
        },
    }

    for scenario in scenarios:
        snapshot = scenario.get("payload_snapshot", {})
        result = snapshot.get("result", {})

        comparison["scenarios"].append({
            "id": scenario.get("id"),
            "name": scenario.get("name"),
            "description": scenario.get("description"),
        })

        # Extract metrics (these depend on actual result structure)
        uplink = result.get("uplink", {})
        downlink = result.get("downlink", {})

        comparison["metrics"]["uplink_margin_db"].append(
            uplink.get("link_margin_db"),
        )
        comparison["metrics"]["downlink_margin_db"].append(
            downlink.get("link_margin_db"),
        )
        comparison["metrics"]["combined_margin_db"].append(
            result.get("combined_margin_db"),
        )
        comparison["metrics"]["modcod_selected"].append(
            result.get("modcod_selected"),
        )

    return comparison
