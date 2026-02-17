"""LangGraph workflow definition for link budget calculations."""

from typing import Literal

from langgraph.graph import END, StateGraph

from ntn_agents.nodes.asset import asset_node
from ntn_agents.nodes.calculator import calculator_node
from ntn_agents.nodes.expert import expert_node
from ntn_agents.nodes.human import human_node
from ntn_agents.nodes.optimizer import optimizer_node
from ntn_agents.nodes.parser import parser_node
from ntn_agents.state import LinkBudgetState


def should_confirm_assets(state: LinkBudgetState) -> Literal["confirm", "calculate"]:
    """Determine if user confirmation is needed for assets."""
    if state.get("awaiting_confirmation"):
        return "confirm"
    if not state.get("assets_ready"):
        return "confirm"
    return "calculate"


def should_optimize(state: LinkBudgetState) -> Literal["optimize", "end"]:
    """Determine if optimization should run."""
    mode = state.get("mode", "design")
    if mode == "optimize":
        return "optimize"
    if state.get("should_optimize"):
        return "optimize"
    return "end"


def after_human(state: LinkBudgetState) -> Literal["resolve_assets", "calculate", "end"]:
    """Determine next step after human interaction."""
    user_response = state.get("user_response", "").lower()

    if user_response in ("cancel", "stop", "quit"):
        return "end"

    confirmation_type = state.get("confirmation_type")

    if confirmation_type == "asset_creation":
        return "resolve_assets"
    if confirmation_type == "proceed":
        return "calculate"

    return "resolve_assets"


def create_link_budget_graph() -> StateGraph:
    """Create the main link budget workflow graph.

    The graph flow:
    1. Parse: Extract parameters from natural language
    2. Resolve Assets: Find or propose satellites/earth stations
    3. (Optional) Human Confirm: Get user approval for asset creation
    4. Calculate: Run link budget calculation
    5. Explain: Analyze results with ITU-R expertise
    6. (Optional) Optimize: Find optimal parameters

    Returns:
        Compiled StateGraph ready for invocation.
    """
    graph = StateGraph(LinkBudgetState)

    # Add nodes
    graph.add_node("parse", parser_node)
    graph.add_node("resolve_assets", asset_node)
    graph.add_node("human_confirm", human_node)
    graph.add_node("calculate", calculator_node)
    graph.add_node("explain", expert_node)
    graph.add_node("optimize", optimizer_node)

    # Set entry point
    graph.set_entry_point("parse")

    # Define edges
    graph.add_edge("parse", "resolve_assets")

    graph.add_conditional_edges(
        "resolve_assets",
        should_confirm_assets,
        {
            "confirm": "human_confirm",
            "calculate": "calculate",
        },
    )

    graph.add_conditional_edges(
        "human_confirm",
        after_human,
        {
            "resolve_assets": "resolve_assets",
            "calculate": "calculate",
            "end": END,
        },
    )

    graph.add_edge("calculate", "explain")

    graph.add_conditional_edges(
        "explain",
        should_optimize,
        {
            "optimize": "optimize",
            "end": END,
        },
    )

    graph.add_edge("optimize", END)

    return graph.compile()


# Pre-compiled graph instance
link_budget_graph = create_link_budget_graph()


async def run_link_budget(
    request: str,
    mode: Literal["design", "optimize", "consult"] = "design",
) -> LinkBudgetState:
    """Run the link budget workflow with a natural language request.

    Args:
        request: Natural language description of the link budget request.
        mode: Workflow mode - "design", "optimize", or "consult".

    Returns:
        Final state after workflow completion.
    """
    initial_state: LinkBudgetState = {
        "messages": [],
        "mode": mode,
        "original_request": request,
        "extracted_params": {},
        "locations_resolved": False,
        "parse_errors": [],
        "resolved_assets": {},
        "assets_ready": False,
        "missing_assets": [],
        "proposed_assets": [],
        "explanations": [],
        "recommendations": [],
        "warnings": [],
        "optimization_results": [],
        "awaiting_confirmation": False,
        "should_optimize": False,
        "iteration_count": 0,
        "max_iterations": 10,
    }

    result = await link_budget_graph.ainvoke(initial_state)
    return result
