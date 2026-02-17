"""Parser node for extracting parameters from natural language requests."""

import logging
import re
from typing import Any

from geopy.exc import GeocoderServiceError, GeocoderTimedOut
from geopy.geocoders import Nominatim
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from ntn_agents.config import settings

logger = logging.getLogger(__name__)
from ntn_agents.knowledge.frequency_bands import get_band_info, get_typical_frequencies
from ntn_agents.knowledge.locations import get_location_info, get_satellite_info
from ntn_agents.state import ExtractedParams, LinkBudgetState

PARSER_SYSTEM_PROMPT = """You are a satellite communications expert parsing natural language requests into structured parameters.

Extract the following information from the user's request:
1. Location/Earth station (city name, coordinates)
2. Satellite (name, orbital position)
3. Frequency band (L, S, C, Ku, Ka, etc.)
4. Target specifications (data rate, margin, availability)
5. Weather conditions (rain rate if mentioned)
6. Transponder type (transparent or regenerative if mentioned)

Respond in JSON format with these fields:
{
    "location_name": "city or station name",
    "satellite_name": "satellite name if mentioned",
    "sat_longitude_deg": longitude if mentioned,
    "frequency_band": "band name",
    "target_margin_db": target margin if mentioned,
    "target_data_rate_bps": data rate if mentioned,
    "rain_rate_mm_per_hr": rain rate if mentioned,
    "transponder_type": "TRANSPARENT" or "REGENERATIVE" if mentioned,
    "notes": "any other relevant information"
}

Only include fields that are explicitly mentioned or clearly implied.
If something is not mentioned, omit the field.
"""


def _parse_coordinates(text: str) -> tuple[float, float] | None:
    """Try to extract coordinates from text like '35.6N, 139.7E'."""
    # Pattern for decimal coordinates
    coord_pattern = r"(-?\d+\.?\d*)\s*°?\s*([NS])?\s*,?\s*(-?\d+\.?\d*)\s*°?\s*([EW])?"
    match = re.search(coord_pattern, text, re.IGNORECASE)

    if match:
        lat = float(match.group(1))
        if match.group(2) and match.group(2).upper() == "S":
            lat = -lat

        lon = float(match.group(3))
        if match.group(4) and match.group(4).upper() == "W":
            lon = -lon

        return (lat, lon)

    return None


def _geocode_location(location_name: str) -> dict[str, Any] | None:
    """Geocode a location name to coordinates using Nominatim."""
    try:
        geolocator = Nominatim(
            user_agent=settings.nominatim_user_agent,
            timeout=settings.geocoding_timeout,
        )
        location = geolocator.geocode(location_name)

        if location:
            return {
                "latitude_deg": location.latitude,
                "longitude_deg": location.longitude,
                "display_name": location.address,
            }
    except (GeocoderTimedOut, GeocoderServiceError):
        logger.warning("Geocoding failed for %r", location_name, exc_info=True)

    return None


_ALLOWED_LLM_KEYS = {
    "location_name",
    "satellite_name",
    "sat_longitude_deg",
    "frequency_band",
    "target_margin_db",
    "target_data_rate_bps",
    "rain_rate_mm_per_hr",
    "transponder_type",
    "notes",
}

_MAX_USER_INPUT_CHARS = 2000


def _extract_json_balanced(text: str) -> str | None:
    """Extract the first balanced ``{...}`` block from *text*."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _extract_with_llm(request: str) -> dict[str, Any]:
    """Use LLM to extract parameters from natural language."""
    if not settings.anthropic_api_key:
        return {}

    import json
    import logging

    logger = logging.getLogger(__name__)

    truncated = request[:_MAX_USER_INPUT_CHARS]

    try:
        llm = ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key,
            temperature=0,
            max_tokens=1024,
        )

        messages = [
            SystemMessage(content=PARSER_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    "Parse this request:\n"
                    "--- BEGIN USER INPUT ---\n"
                    f"{truncated}\n"
                    "--- END USER INPUT ---"
                ),
            ),
        ]

        response = llm.invoke(messages)
        content = response.content

        json_str = _extract_json_balanced(content)
        if json_str:
            parsed = json.loads(json_str)
            return {k: v for k, v in parsed.items() if k in _ALLOWED_LLM_KEYS}

    except Exception:
        logger.warning("LLM parameter extraction failed", exc_info=True)

    return {}


def _extract_frequency_band(text: str) -> str | None:
    """Extract frequency band from text."""
    text_lower = text.lower()

    band_patterns = [
        (r"\bka[\s-]?band\b", "Ka"),
        (r"\bku[\s-]?band\b", "Ku"),
        (r"\bc[\s-]?band\b", "C"),
        (r"\bx[\s-]?band\b", "X"),
        (r"\bs[\s-]?band\b", "S"),
        (r"\bl[\s-]?band\b", "L"),
        (r"\bq[\s-]?band\b", "Q"),
        (r"\bv[\s-]?band\b", "V"),
    ]

    for pattern, band in band_patterns:
        if re.search(pattern, text_lower):
            return band

    # Check for frequency values
    freq_match = re.search(r"(\d+\.?\d*)\s*(ghz|mhz)", text_lower)
    if freq_match:
        freq = float(freq_match.group(1))
        unit = freq_match.group(2)
        if unit == "mhz":
            freq /= 1000  # Convert to GHz

        # Map frequency to band
        if 1 < freq < 2:
            return "L"
        if 2 < freq < 4:
            return "S"
        if 4 < freq < 8:
            return "C"
        if 8 < freq < 12:
            return "X"
        if 12 < freq < 18:
            return "Ku"
        if 18 < freq < 40:
            return "Ka"

    return None


def _extract_satellite_name(text: str) -> tuple[str | None, float | None]:
    """Extract satellite name and/or longitude from text.

    Satellite name extraction relies on the LLM parser.
    This function focuses on extracting orbital longitude from text.
    """
    # Check for orbital longitude (e.g., "128E", "128.5°E")
    lon_match = re.search(r"(\d+\.?\d*)\s*°?\s*([EW])", text, re.IGNORECASE)
    if lon_match:
        lon = float(lon_match.group(1))
        if lon_match.group(2).upper() == "W":
            lon = -lon
        return None, lon

    return None, None


async def parser_node(state: LinkBudgetState) -> LinkBudgetState:
    """Parse the natural language request into structured parameters.

    This node:
    1. Extracts location names and geocodes them
    2. Identifies satellite names and orbital positions
    3. Determines frequency bands and typical frequencies
    4. Extracts target specifications (margin, data rate)
    5. Identifies environmental conditions

    Args:
        state: Current workflow state

    Returns:
        Updated state with extracted_params populated
    """
    request = state.get("original_request", "")
    params: ExtractedParams = {}
    errors: list[str] = []

    # Try LLM extraction first
    llm_params = _extract_with_llm(request)

    # Extract and resolve location
    location_name = llm_params.get("location_name")
    if location_name:
        # Check known locations first
        known = get_location_info(location_name)
        if known:
            params["ground_lat_deg"] = known["latitude_deg"]
            params["ground_lon_deg"] = known["longitude_deg"]
            params["ground_alt_m"] = known["altitude_m"]
            params["location_name"] = known["name"]
            params["rain_rate_mm_per_hr"] = known["typical_rain_rate"]
        else:
            # Try geocoding
            geocoded = _geocode_location(location_name)
            if geocoded:
                params["ground_lat_deg"] = geocoded["latitude_deg"]
                params["ground_lon_deg"] = geocoded["longitude_deg"]
                params["ground_alt_m"] = 0.0
                params["location_name"] = geocoded["display_name"]
            else:
                errors.append(f"Could not geocode location: {location_name}")

    # Also try coordinate extraction directly from text
    coords = _parse_coordinates(request)
    if coords and "ground_lat_deg" not in params:
        params["ground_lat_deg"] = coords[0]
        params["ground_lon_deg"] = coords[1]
        params["ground_alt_m"] = 0.0

    # Extract satellite
    sat_name = llm_params.get("satellite_name")
    sat_lon = llm_params.get("sat_longitude_deg")

    if sat_name:
        sat_info = get_satellite_info(sat_name)
        if sat_info:
            params["satellite_name"] = sat_info["name"]
            params["sat_longitude_deg"] = sat_info["longitude_deg"]
        else:
            params["satellite_name"] = sat_name
            if sat_lon:
                params["sat_longitude_deg"] = sat_lon
    elif sat_lon:
        params["sat_longitude_deg"] = sat_lon

    # Fallback extraction from text
    if "satellite_name" not in params:
        extracted_name, extracted_lon = _extract_satellite_name(request)
        if extracted_name:
            params["satellite_name"] = extracted_name
        if extracted_lon and "sat_longitude_deg" not in params:
            params["sat_longitude_deg"] = extracted_lon

    # Extract frequency band
    band = llm_params.get("frequency_band") or _extract_frequency_band(request)
    if band:
        params["frequency_band"] = band
        band_info = get_band_info(band)
        if band_info:
            freqs = get_typical_frequencies(band)
            if freqs:
                params["uplink_frequency_hz"] = freqs["uplink_hz"]
                params["downlink_frequency_hz"] = freqs["downlink_hz"]

    # Extract target specifications
    if "target_margin_db" in llm_params:
        params["target_margin_db"] = float(llm_params["target_margin_db"])

    if "target_data_rate_bps" in llm_params:
        params["target_data_rate_bps"] = float(llm_params["target_data_rate_bps"])

    # Extract rain rate
    if "rain_rate_mm_per_hr" in llm_params:
        params["rain_rate_mm_per_hr"] = float(llm_params["rain_rate_mm_per_hr"])

    # Extract transponder type
    if "transponder_type" in llm_params:
        params["transponder_type"] = llm_params["transponder_type"]

    # Check if location was resolved
    locations_resolved = "ground_lat_deg" in params and "ground_lon_deg" in params

    return {
        **state,
        "extracted_params": params,
        "locations_resolved": locations_resolved,
        "parse_errors": errors,
    }
