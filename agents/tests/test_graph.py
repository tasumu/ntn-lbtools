"""Tests for the LangGraph link budget workflow."""

import pytest

from ntn_agents.knowledge.frequency_bands import get_band_info, get_typical_frequencies
from ntn_agents.knowledge.itu_r import explain_loss, get_recommendation_guidance
from ntn_agents.knowledge.locations import get_location_info, get_satellite_info
from ntn_agents.state import LinkBudgetState


class TestKnowledgeBase:
    """Tests for the knowledge base modules."""

    def test_get_band_info_ku(self):
        """Test Ku-band information retrieval."""
        info = get_band_info("Ku")
        assert info is not None
        assert info["name"] == "Ku-band"
        assert info["uplink_ghz"] == (14.0, 14.5)

    def test_get_band_info_aliases(self):
        """Test band name aliases."""
        info1 = get_band_info("ku-band")
        info2 = get_band_info("kuband")
        info3 = get_band_info("Ku")
        assert info1 == info2 == info3

    def test_get_typical_frequencies(self):
        """Test typical frequency retrieval."""
        freqs = get_typical_frequencies("Ka")
        assert freqs is not None
        assert "uplink_hz" in freqs
        assert "downlink_hz" in freqs
        assert freqs["uplink_hz"] > 20e9

    def test_get_location_info_tokyo(self):
        """Test Tokyo location info."""
        info = get_location_info("tokyo")
        assert info is not None
        assert info["name"] == "Tokyo"
        assert 35 < info["latitude_deg"] < 36
        assert 139 < info["longitude_deg"] < 140

    def test_get_satellite_info_unknown(self):
        """Test satellite info returns None for unknown satellite."""
        info = get_satellite_info("unknown-sat-1")
        assert info is None

    def test_satellite_aliases_empty(self):
        """Test satellite alias lookup returns None when no data is loaded."""
        info = get_satellite_info("some-alias")
        assert info is None

    def test_get_recommendation_guidance(self):
        """Test ITU-R recommendation guidance."""
        guidance = get_recommendation_guidance("P.618", "high_loss")
        assert "mitigations" in guidance
        assert len(guidance["mitigations"]) > 0

    def test_explain_rain_loss_high(self):
        """Test rain loss explanation for high value."""
        explanation = explain_loss("rain", 15.0, 14e9)
        assert "降雨減衰" in explanation
        assert "P.618" in explanation
        assert "対策" in explanation

    def test_explain_fspl(self):
        """Test FSPL explanation."""
        explanation = explain_loss("fspl", 206.0, 14e9)
        assert "自由空間損失" in explanation
        assert "Ku" in explanation


class TestState:
    """Tests for state definitions."""

    def test_link_budget_state_creation(self):
        """Test creating a LinkBudgetState."""
        state: LinkBudgetState = {
            "messages": [],
            "mode": "design",
            "original_request": "Test request",
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

        assert state["mode"] == "design"
        assert state["assets_ready"] is False


class TestGraphStructure:
    """Tests for graph structure (without actual execution)."""

    def test_graph_compiles(self):
        """Test that the graph compiles without errors."""
        from ntn_agents.graph import create_link_budget_graph

        graph = create_link_budget_graph()
        assert graph is not None

    def test_graph_has_nodes(self):
        """Test that the graph has expected nodes."""
        from ntn_agents.graph import link_budget_graph

        # Check that graph exists
        assert link_budget_graph is not None


@pytest.mark.asyncio
class TestParserNode:
    """Tests for the parser node (requires mocking for LLM calls)."""

    async def test_parser_extracts_known_location(self):
        """Test parser extracts known location."""
        from ntn_agents.nodes.parser import parser_node

        state: LinkBudgetState = {
            "messages": [],
            "mode": "design",
            "original_request": "Link from Tokyo to satellite at 128E",
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

        # Note: This test will work with pattern matching even without LLM
        result = await parser_node(state)

        # Check that satellite was extracted
        params = result.get("extracted_params", {})
        assert params.get("satellite_name") is not None or params.get("sat_longitude_deg") is not None


@pytest.mark.asyncio
class TestExpertNode:
    """Tests for the expert node."""

    async def test_expert_analyzes_result(self):
        """Test expert provides analysis for calculation result."""
        from ntn_agents.nodes.expert import expert_node

        state: LinkBudgetState = {
            "messages": [],
            "mode": "design",
            "original_request": "Test",
            "extracted_params": {
                "frequency_band": "Ku",
                "uplink_frequency_hz": 14e9,
                "downlink_frequency_hz": 12e9,
            },
            "locations_resolved": True,
            "parse_errors": [],
            "resolved_assets": {},
            "assets_ready": True,
            "missing_assets": [],
            "proposed_assets": [],
            "calculation_result": {
                "uplink_fspl_db": 206.0,
                "uplink_rain_loss_db": 5.0,
                "uplink_gas_loss_db": 0.5,
                "uplink_margin_db": 3.5,
                "downlink_fspl_db": 205.0,
                "downlink_rain_loss_db": 4.0,
                "downlink_margin_db": 4.0,
                "combined_margin_db": 2.5,
                "modcod_selected": "QPSK 1/2",
            },
            "explanations": [],
            "recommendations": [],
            "warnings": [],
            "optimization_results": [],
            "awaiting_confirmation": False,
            "should_optimize": False,
            "iteration_count": 0,
            "max_iterations": 10,
        }

        result = await expert_node(state)

        # Check that explanations were generated
        assert len(result.get("explanations", [])) > 0
        assert "Ku" in result["explanations"][0]
