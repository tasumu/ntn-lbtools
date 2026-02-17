"""Embedded knowledge for satellite link budget design."""

from ntn_agents.knowledge.frequency_bands import FREQUENCY_BANDS, get_band_info
from ntn_agents.knowledge.itu_r import ITU_R_KNOWLEDGE, get_recommendation_guidance
from ntn_agents.knowledge.locations import (
    KNOWN_LOCATIONS,
    KNOWN_SATELLITES,
    get_location_info,
    get_satellite_info,
)

__all__ = [
    "ITU_R_KNOWLEDGE",
    "get_recommendation_guidance",
    "FREQUENCY_BANDS",
    "get_band_info",
    "KNOWN_LOCATIONS",
    "KNOWN_SATELLITES",
    "get_location_info",
    "get_satellite_info",
]
