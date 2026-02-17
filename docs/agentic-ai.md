"""Tool implementations and supporting types for the MCP server."""

import logging
import os
import sys
from typing import Literal

import httpx
from fastmcp import FastMCP

from .config import Settings, settings  # noqa: F401 - re-export Settings for callers
from .openapi_patch import patch_openapi_spec_for_mcp

logger = logging.getLogger(__name__)

# To use server.py:2505 the new parser, set FASTMCP_EXPERIMENTAL_ENABLE_NEW_OPENAPI_PARSER=true. The new parser was introduced for testing in 2.11 and will become the default soon.
os.environ.setdefault("FASTMCP_EXPERIMENTAL_ENABLE_NEW_OPENAPI_PARSER", "true")


# -----------------
# MCP instance and tools
# -----------------

# Fetch OpenAPI from the configured backend and wire the client with base_url so paths resolve.
base_url = str(settings.backend_api_url).rstrip("/")
try:
    openapi_spec = httpx.get(f"{base_url}/openapi.json", timeout=5).json()
except (httpx.ConnectError, httpx.TimeoutException) as exc:
    logger.error("Failed to fetch OpenAPI spec from backend: %s", type(exc).__name__)
    sys.exit(1)
openapi_spec = patch_openapi_spec_for_mcp(openapi_spec)
client = httpx.AsyncClient(base_url=base_url)

mcp = FastMCP.from_openapi(
    name="NTN Link Budget MCP",
    openapi_spec=openapi_spec,
    client=client,
)


@mcp.tool
def echo(text: str) -> str:
    """echo tool for testing."""

    return "this is echo reply" + text

@mcp.prompt(
    name="link_budget_from_request",
    description="Provide a step-by-step plan to derive a link budget from a natural-language request"
)
def prompt_link_budget_from_request(request: str):
    return f"""
You are an NTN link budget planner. User request: {request}
Goal: reuse existing assets when they match; otherwise propose creating new ones.
Always act with MCP tools. Steps:
1) Parse the ask: orbit/slot, band/frequency, BW, data rate, locations (lat/lon/alt), elevation constraints, rain rate, waveform/modcod hints, tx power/antenna sizes.
2) Check assets with list_scenarios, list_satellites, list_earth_stations, list_modcod. Prefer matches by band, longitude, diameter/gain, tx power, and notes.
3) If nothing suitable, ask user for the missing fields and draft JSON bodies for create_satellite/create_earth_station/create_modcod so they can be registered.
4) When inputs are ready, call calculate_api_v1_link_budgets_calculate_post with chosen IDs and runtime parameters (sat_longitude_deg, uplink/downlink freq/BW/elevation/rain/temp/coords, overrides if any).
5) Summarize for the user: waveform_strategy, transponder_type, modcod_selected, uplink/downlink/combined C/N0 and link margins, dominant losses (FSPL, rain, gas, cloud, pointing), and assumptions made. Flag risks (negative or low margin, missing fields).
"""

@mcp.prompt(
    name="asset_selection_or_creation",
    description="Question guide to select existing assets or propose new registrations"
)
def prompt_asset_selection_or_creation(missing_context: str = ""):
    return f"""
Context (if any): {missing_context}
When a required asset is missing or unclear, collect only what is needed to call create_satellite or create_earth_station.
Ask concise follow-ups to fill:
- Satellite: name, orbit_type (GEO/MEO/LEO), longitude_deg (for GEO), frequency_band, eirp_dbw, gt_db_per_k, transponder_bandwidth_mhz, notes.
- Earth station: name, latitude_deg, longitude_deg, altitude_m, antenna_diameter_m or antenna_gain_db, tx_power_dbw, polarization, notes.
Propose a minimal JSON body for the right create_* endpoint, and confirm before sending.
"""

@mcp.prompt(
    name="modcod_table_creation",
    description="Guide for gathering inputs and computing fields to add a ModCod table"
)
def prompt_modcod_table_creation(context: str = ""):
    return f"""
Context (if any): {context}
You are helping create a ModCod table for create_modcod.
Tasks:
1) Decide table-level fields: name (required), waveform (e.g. DVB_S2X), version (optional), description.
2) For each entry, collect or derive: id, modulation, code_rate, info_bits_per_symbol, and at least one threshold
   (required_ebno_db or required_cn0_dbhz). Optional: rolloff (alpha), pilots.
3) Use these relationships (units: Rb=bps, Rs=baud, B=Hz):
   - C/N(dB) = Eb/N0(dB) + 10*log10(Rb/B)
   - C/N0(dBHz) = Eb/N0(dB) + 10*log10(Rb)
   - B = Rs*(1+alpha)
   - Rb = Rs * info_bits_per_symbol
   - Therefore Rb/B = info_bits_per_symbol/(1+alpha)
   - If rolloff is not provided, treat alpha=0.
   - For uncoded modulation, info_bits_per_symbol = log2(M) and Rb = Rs*log2(M) (QPSK=2, 8PSK=3, 16QAM=4).
4) Choose thresholds from available data:
   - If Eb/N0 is given, set required_ebno_db directly.
   - If C/N0 and Rb are given, required_ebno_db = C/N0 - 10*log10(Rb).
   - If C/N and Rb/B (or info_bits_per_symbol + rolloff) are given, Eb/N0 = C/N - 10*log10(Rb/B).
   - If Eb/N0 and Rb are known, you may also compute required_cn0_dbhz = Eb/N0 + 10*log10(Rb).
5) Compute info_bits_per_symbol when missing: log2(M) * code_rate
   (e.g., BPSK=1, QPSK=2, 8PSK=3, 16APSK=4).
6) Ensure info_bits_per_symbol > 0 and each entry includes at least one threshold.
7) Output a JSON body for create_modcod. Ask only for missing values needed to compute thresholds or identify entries.
"""

@mcp.prompt(
    name="summarize_calculation_response",
    description="Summarize a CalculationResponse for the user"
)
def prompt_summarize_calculation_response(calc_response_json: str, scenario_name: str | None = None):
    scenario_label = scenario_name or "ad-hoc calculation"
    return f"""
Summarize the link budget result for {scenario_label} in bullets.
Input: CalculationResponse JSON = {calc_response_json}
Report: waveform_strategy, transponder_type, modcod_selected, uplink/downlink C/N0, link margins, combined metrics (if present), EIRP and G/T if present, major losses (FSPL, rain, gas, cloud, pointing), and runtime assumptions (freq, BW, elevation, rain rate, temperature, location).
Highlight issues: missing fields, negative/low margins, or unrealistic inputs. Keep numbers with units.
"""


# -----------------
# Agentic AI Tools
# -----------------

@mcp.tool
async def agentic_link_budget(
    request: str,
    mode: Literal["design", "optimize", "consult"] = "design",
) -> dict:
    """Intelligently process natural language link budget requests using AI agents.

    This tool uses a LangGraph-based multi-agent system to:
    1. Parse natural language into structured parameters
    2. Resolve or propose satellite and earth station assets
    3. Execute link budget calculations
    4. Analyze results with ITU-R expertise
    5. Optimize parameters if needed

    Modes:
    - design: Create a link budget from natural language description
    - optimize: Find optimal parameters to meet a target margin
    - consult: Step-by-step guided design with explanations

    Args:
        request: Natural language description of the link budget request.
                 Example: "Design a Ku-band link from Tokyo to a satellite at 128E with 5 dB margin"
        mode: Workflow mode (design, optimize, or consult)

    Returns:
        Dictionary containing:
        - extracted_params: Parsed parameters from the request
        - resolved_assets: Matched or proposed satellite/earth station assets
        - calculation_result: Link budget calculation results (if successful)
        - explanations: ITU-R based analysis of the results
        - recommendations: Suggested improvements
        - warnings: Potential issues identified
        - optimization_results: Parameter variations explored (if mode=optimize)
    """
    try:
        from ntn_agents.graph import run_link_budget

        result = await run_link_budget(request, mode)

        # Convert state to serializable dict
        return {
            "mode": result.get("mode"),
            "original_request": result.get("original_request"),
            "extracted_params": dict(result.get("extracted_params", {})),
            "locations_resolved": result.get("locations_resolved"),
            "resolved_assets": dict(result.get("resolved_assets", {})),
            "assets_ready": result.get("assets_ready"),
            "missing_assets": result.get("missing_assets", []),
            "calculation_result": dict(result.get("calculation_result", {}))
            if result.get("calculation_result")
            else None,
            "calculation_error": result.get("calculation_error"),
            "explanations": result.get("explanations", []),
            "recommendations": result.get("recommendations", []),
            "warnings": result.get("warnings", []),
            "optimization_results": result.get("optimization_results", []),
            "best_result": result.get("best_result"),
        }

    except ImportError:
        return {
            "error": "ntn_agents package not installed. "
            "Install with: cd agents && uv sync",
            "fallback": "Use the link_budget_from_request prompt instead.",
        }
    except Exception as e:
        return {
            "error": str(e),
            "request": request,
            "mode": mode,
        }


@mcp.tool
async def explain_propagation(
    loss_type: Literal["rain", "gas", "cloud", "fspl", "pointing"],
    value_db: float,
    frequency_hz: float | None = None,
    elevation_deg: float | None = None,
) -> str:
    """Explain a propagation loss value with ITU-R context.

    This tool provides expert explanations for various loss components
    in a satellite link budget, including relevant ITU-R recommendations
    and mitigation strategies.

    Args:
        loss_type: Type of loss to explain
            - rain: Rain attenuation (ITU-R P.618)
            - gas: Gaseous attenuation (ITU-R P.676)
            - cloud: Cloud attenuation (ITU-R P.840)
            - fspl: Free space path loss (ITU-R P.525)
            - pointing: Antenna pointing loss
        value_db: Loss value in dB
        frequency_hz: Operating frequency in Hz (optional, for context)
        elevation_deg: Elevation angle in degrees (optional, for context)

    Returns:
        Human-readable explanation of the loss with ITU-R references.
    """
    try:
        from ntn_agents.knowledge.itu_r import explain_loss

        return explain_loss(loss_type, value_db, frequency_hz, elevation_deg)
    except ImportError:
        return f"{loss_type} loss: {value_db:.1f} dB (ntn_agents not installed)"


@mcp.tool
async def get_itu_r_guidance(
    recommendation: str,
    condition: str | None = None,
) -> dict:
    """Get guidance from ITU-R recommendations for satellite link design.

    This tool provides expert knowledge from ITU-R recommendations
    including typical values, mitigation strategies, and best practices.

    Args:
        recommendation: ITU-R recommendation identifier
            - P.618: Rain attenuation
            - P.676: Gaseous attenuation
            - P.840: Cloud attenuation
            - P.525: Free space path loss
            - P.453: Refractivity
        condition: Specific condition to get guidance for
            - P.618: "high_loss", "frequency_scaling", "elevation_effect"
            - P.676: "absorption_peaks", "high_humidity", "ka_band"
            - P.840: "frequency_dependence", "cloudy_regions"

    Returns:
        Dictionary containing recommendation information and guidance.
    """
    try:
        from ntn_agents.knowledge.itu_r import get_recommendation_guidance

        return get_recommendation_guidance(recommendation, condition)
    except ImportError:
        return {"error": "ntn_agents not installed", "recommendation": recommendation}


@mcp.tool
async def get_frequency_band_info(band_name: str) -> dict:
    """Get information about a satellite frequency band.

    This tool provides details about frequency bands used in satellite
    communications including typical applications and rain sensitivity.

    Args:
        band_name: Frequency band name (L, S, C, Ku, Ka, Q, V)
                   Case-insensitive, supports variants like "ku-band", "Ka"

    Returns:
        Dictionary containing:
        - name: Full band name
        - uplink_ghz: Uplink frequency range (min, max)
        - downlink_ghz: Downlink frequency range (min, max)
        - typical_applications: Common use cases
        - rain_sensitivity: Rain fade severity
        - notes: Additional information
    """
    try:
        from ntn_agents.knowledge.frequency_bands import get_band_info

        info = get_band_info(band_name)
        if info:
            return dict(info)
        return {"error": f"Unknown frequency band: {band_name}"}
    except ImportError:
        return {"error": "ntn_agents not installed", "band": band_name}


@mcp.tool
async def get_satellite_info(name: str) -> dict:
    """Get information about a known satellite.

    This tool provides details about well-known GEO satellites
    including orbital position and supported frequency bands.

    Args:
        name: Satellite name as registered in the knowledge base or database.
              Case-insensitive, supports aliases.

    Returns:
        Dictionary containing:
        - name: Official satellite name
        - longitude_deg: Orbital longitude in degrees East
        - operator: Satellite operator
        - frequency_bands: Supported bands (C, Ku, Ka, etc.)
        - orbit_type: Orbit type (GEO, MEO, LEO)
        - notes: Additional information
    """
    try:
        from ntn_agents.knowledge.locations import get_satellite_info as get_sat

        info = get_sat(name)
        if info:
            return dict(info)
        return {"error": f"Unknown satellite: {name}"}
    except ImportError:
        return {"error": "ntn_agents not installed", "satellite": name}


@mcp.tool
async def get_location_info(name: str) -> dict:
    """Get information about a known location for earth station placement.

    This tool provides geographic coordinates and typical rain rates
    for major cities and satellite ground station locations.

    Args:
        name: Location name (e.g., "Tokyo", "Singapore", "Sydney")
              Case-insensitive

    Returns:
        Dictionary containing:
        - name: Location name
        - latitude_deg: Latitude in degrees
        - longitude_deg: Longitude in degrees
        - altitude_m: Altitude above sea level
        - country: Country name
        - typical_rain_rate: Rain rate for 0.01% availability (mm/hr)
        - climate_zone: Climate classification
    """
    try:
        from ntn_agents.knowledge.locations import get_location_info as get_loc

        info = get_loc(name)
        if info:
            return dict(info)
        return {"error": f"Unknown location: {name}"}
    except ImportError:
        return {"error": "ntn_agents not installed", "location": name}
