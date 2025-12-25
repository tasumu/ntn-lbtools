"""Tool implementations and supporting types for the MCP server."""

import os

import httpx
from fastmcp import FastMCP

from .config import Settings, settings  # noqa: F401 - re-export Settings for callers
from .openapi_patch import patch_openapi_spec_for_mcp

# To use server.py:2505 the new parser, set FASTMCP_EXPERIMENTAL_ENABLE_NEW_OPENAPI_PARSER=true. The new parser was introduced for testing in 2.11 and will become the default soon.
os.environ.setdefault("FASTMCP_EXPERIMENTAL_ENABLE_NEW_OPENAPI_PARSER", "true")


# -----------------
# MCP instance and tools
# -----------------

# Fetch OpenAPI from the configured backend and wire the client with base_url so paths resolve.
base_url = str(settings.backend_api_url).rstrip("/")
openapi_spec = httpx.get(f"{base_url}/openapi.json", timeout=5).json()
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
1) Decide table-level fields: waveform (e.g. DVB_S2X), version, description.
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
