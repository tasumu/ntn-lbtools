# ruff: noqa: E402, E501
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.api.schemas.sweep import SweepConfig, SweepPoint
from src.services.sweep_service import (
    SweepService,
    compute_crossover,
    set_nested_value,
)


# ---------------------------------------------------------------------------
# Unit tests for set_nested_value
# ---------------------------------------------------------------------------
class TestSetNestedValue:
    def test_sets_top_level_key(self):
        obj = {"a": 1}
        set_nested_value(obj, "a", 42)
        assert obj["a"] == 42

    def test_sets_nested_key(self):
        obj = {"runtime": {"uplink": {"rain_rate_mm_per_hr": 0}}}
        set_nested_value(obj, "runtime.uplink.rain_rate_mm_per_hr", 50.0)
        assert obj["runtime"]["uplink"]["rain_rate_mm_per_hr"] == 50.0

    def test_creates_intermediate_dicts(self):
        obj = {"overrides": None}
        set_nested_value(obj, "overrides.satellite.eirp_dbw", 45.0)
        assert obj["overrides"]["satellite"]["eirp_dbw"] == 45.0

    def test_creates_all_missing_levels(self):
        obj = {}
        set_nested_value(obj, "a.b.c", 99)
        assert obj["a"]["b"]["c"] == 99


# ---------------------------------------------------------------------------
# Unit tests for compute_crossover
# ---------------------------------------------------------------------------
class TestComputeCrossover:
    def test_crossover_between_two_points(self):
        points = [
            SweepPoint(sweep_value=0.0, combined_link_margin_db=6.0),
            SweepPoint(sweep_value=10.0, combined_link_margin_db=2.0),
        ]
        result = compute_crossover(points, threshold_db=3.0)
        assert result is not None
        assert pytest.approx(result, rel=0.01) == 7.5

    def test_no_crossover_all_above(self):
        points = [
            SweepPoint(sweep_value=0.0, combined_link_margin_db=10.0),
            SweepPoint(sweep_value=10.0, combined_link_margin_db=8.0),
        ]
        assert compute_crossover(points, threshold_db=3.0) is None

    def test_no_crossover_all_below(self):
        points = [
            SweepPoint(sweep_value=0.0, combined_link_margin_db=1.0),
            SweepPoint(sweep_value=10.0, combined_link_margin_db=-2.0),
        ]
        assert compute_crossover(points, threshold_db=3.0) is None

    def test_crossover_with_none_margin_skipped(self):
        points = [
            SweepPoint(sweep_value=0.0, combined_link_margin_db=6.0),
            SweepPoint(sweep_value=5.0, combined_link_margin_db=None),
            SweepPoint(sweep_value=10.0, combined_link_margin_db=2.0),
        ]
        # Crossover between points 0 and 2 should NOT be detected
        # because points[0] -> points[1] has None margin,
        # and points[1] -> points[2] also has None margin on the left
        result = compute_crossover(points, threshold_db=3.0)
        assert result is None

    def test_crossover_returns_none_when_threshold_is_none(self):
        points = [
            SweepPoint(sweep_value=0.0, combined_link_margin_db=6.0),
            SweepPoint(sweep_value=10.0, combined_link_margin_db=2.0),
        ]
        assert compute_crossover(points, threshold_db=None) is None

    def test_crossover_exact_on_threshold(self):
        # When one point is exactly on threshold, no crossover between adjacent
        points = [
            SweepPoint(sweep_value=0.0, combined_link_margin_db=6.0),
            SweepPoint(sweep_value=5.0, combined_link_margin_db=3.0),  # exactly threshold
            SweepPoint(sweep_value=10.0, combined_link_margin_db=1.0),
        ]
        # 0->1: (6-3)*(3-3) = 0, not < 0, so no crossover
        # 1->2: (3-3)*(1-3) = 0*(-2) = 0, not < 0
        result = compute_crossover(points, threshold_db=3.0)
        assert result is None


# ---------------------------------------------------------------------------
# Unit tests for SweepConfig validation
# ---------------------------------------------------------------------------
class TestSweepConfigValidation:
    def test_valid_config(self):
        config = SweepConfig(
            parameter_path="runtime.uplink.rain_rate_mm_per_hr",
            start=0,
            end=100,
            steps=50,
        )
        assert config.steps == 50

    def test_invalid_parameter_path(self):
        with pytest.raises(ValueError, match="Unsupported sweep parameter"):
            SweepConfig(
                parameter_path="runtime.uplink.nonexistent_field",
                start=0,
                end=100,
                steps=50,
            )

    def test_start_equals_end(self):
        with pytest.raises(ValueError, match="start and end must differ"):
            SweepConfig(
                parameter_path="runtime.uplink.rain_rate_mm_per_hr",
                start=50,
                end=50,
                steps=10,
            )

    def test_steps_too_high(self):
        with pytest.raises(ValueError):
            SweepConfig(
                parameter_path="runtime.uplink.rain_rate_mm_per_hr",
                start=0,
                end=100,
                steps=201,
            )

    def test_steps_too_low(self):
        with pytest.raises(ValueError):
            SweepConfig(
                parameter_path="runtime.uplink.rain_rate_mm_per_hr",
                start=0,
                end=100,
                steps=1,
            )

    def test_rain_rate_below_minimum(self):
        with pytest.raises(ValueError, match="below minimum"):
            SweepConfig(
                parameter_path="runtime.uplink.rain_rate_mm_per_hr",
                start=-5,
                end=100,
                steps=10,
            )

    def test_elevation_above_maximum(self):
        with pytest.raises(ValueError, match="exceeds maximum"):
            SweepConfig(
                parameter_path="runtime.uplink.elevation_deg",
                start=0,
                end=95,
                steps=10,
            )


# ---------------------------------------------------------------------------
# Integration test for SweepService.execute
# ---------------------------------------------------------------------------
class TestSweepServiceExecute:
    @pytest.mark.asyncio
    async def test_sweep_generates_correct_number_of_points(self):
        """Sweep with 5 steps should produce 5 points."""
        mock_result = {
            "results": {
                "uplink": {"cn_db": 15.0, "rain_loss_db": 1.0, "link_margin_db": 5.0},
                "downlink": {"cn_db": 14.0, "rain_loss_db": 0.5, "link_margin_db": 4.0},
                "combined": {"cn_db": 12.0, "cn0_dbhz": 87.0},
            },
            "combined_link_margin_db": 4.0,
            "combined_cn_db": 12.0,
            "combined_cn0_dbhz": 87.0,
            "modcod_selected": {"id": "qpsk-1/2", "modulation": "QPSK", "code_rate": "1/2"},
            "waveform_strategy": "DVB_S2X",
            "transponder_type": "TRANSPARENT",
        }

        service = SweepService()
        config = SweepConfig(
            parameter_path="runtime.uplink.rain_rate_mm_per_hr",
            start=0,
            end=40,
            steps=5,
        )

        with patch.object(
            __import__("src.services.calculation_service", fromlist=["CalculationService"]).CalculationService,
            "calculate",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            result = await service.execute(
                base_payload={
                    "waveform_strategy": "DVB_S2X",
                    "transponder_type": "TRANSPARENT",
                    "runtime": {
                        "uplink": {"rain_rate_mm_per_hr": 0},
                        "downlink": {"rain_rate_mm_per_hr": 0},
                    },
                },
                sweep_config=config,
                threshold_db=3.0,
            )

        assert len(result.points) == 5
        assert result.sweep_parameter == "runtime.uplink.rain_rate_mm_per_hr"
        assert result.sweep_label == "Uplink Rain Rate (mm/hr)"
        assert result.threshold_db == 3.0

    @pytest.mark.asyncio
    async def test_sweep_handles_individual_calculation_failure(self):
        """If one point raises HTTPException, it should be marked non-viable."""
        from fastapi import HTTPException

        call_count = 0

        async def mock_calculate(self_inner, payload):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise HTTPException(status_code=400, detail="Elevation below horizon")
            return {
                "results": {
                    "uplink": {"cn_db": 15.0, "rain_loss_db": 1.0, "link_margin_db": 5.0},
                    "downlink": {"cn_db": 14.0, "rain_loss_db": 0.5, "link_margin_db": 4.0},
                    "combined": {},
                },
                "combined_link_margin_db": 4.0,
                "combined_cn_db": 12.0,
                "combined_cn0_dbhz": 87.0,
                "modcod_selected": None,
            }

        service = SweepService()
        config = SweepConfig(
            parameter_path="runtime.uplink.rain_rate_mm_per_hr",
            start=0,
            end=20,
            steps=3,
        )

        from src.services.calculation_service import CalculationService

        with patch.object(CalculationService, "calculate", mock_calculate):
            result = await service.execute(
                base_payload={
                    "waveform_strategy": "DVB_S2X",
                    "transponder_type": "TRANSPARENT",
                    "runtime": {
                        "uplink": {"rain_rate_mm_per_hr": 0},
                        "downlink": {"rain_rate_mm_per_hr": 0},
                    },
                },
                sweep_config=config,
                threshold_db=3.0,
            )

        assert len(result.points) == 3
        assert result.points[0].viable is True
        assert result.points[1].viable is False
        assert "Elevation below horizon" in result.points[1].warnings
        assert result.points[2].viable is True

    @pytest.mark.asyncio
    async def test_sweep_values_are_evenly_spaced(self):
        """Verify sweep values from 0 to 100 in 5 steps."""
        service = SweepService()
        config = SweepConfig(
            parameter_path="runtime.uplink.rain_rate_mm_per_hr",
            start=0,
            end=100,
            steps=5,
        )

        async def mock_calculate(self_inner, payload):
            rain = payload["runtime"]["uplink"]["rain_rate_mm_per_hr"]
            return {
                "results": {
                    "uplink": {"cn_db": 15.0, "rain_loss_db": rain * 0.1, "link_margin_db": 10 - rain * 0.1},
                    "downlink": {"cn_db": 14.0, "rain_loss_db": 0.0, "link_margin_db": 5.0},
                    "combined": {},
                },
                "combined_link_margin_db": 10 - rain * 0.1,
                "combined_cn_db": 12.0,
                "combined_cn0_dbhz": 87.0,
                "modcod_selected": None,
            }

        from src.services.calculation_service import CalculationService

        with patch.object(CalculationService, "calculate", mock_calculate):
            result = await service.execute(
                base_payload={
                    "waveform_strategy": "DVB_S2X",
                    "transponder_type": "TRANSPARENT",
                    "runtime": {
                        "uplink": {"rain_rate_mm_per_hr": 0},
                        "downlink": {"rain_rate_mm_per_hr": 0},
                    },
                },
                sweep_config=config,
                threshold_db=3.0,
            )

        sweep_values = [p.sweep_value for p in result.points]
        assert pytest.approx(sweep_values) == [0.0, 25.0, 50.0, 75.0, 100.0]

    @pytest.mark.asyncio
    async def test_sweep_computes_crossover(self):
        """When margin crosses threshold, crossover_value should be populated."""
        service = SweepService()
        config = SweepConfig(
            parameter_path="runtime.uplink.rain_rate_mm_per_hr",
            start=0,
            end=100,
            steps=3,
        )

        # Margins: 10, 3, -4 at rain_rate 0, 50, 100
        # Crossover at threshold=3: between point 1 (margin=3) and point 2 (margin=-4)
        # Actually, margin=3 is exactly on threshold, so crossover between 1->2
        # (3-3)*((-4)-3) = 0*(-7) = 0, not < 0
        # So crossover between 0->1: (10-3)*(3-3) = 7*0 = 0, not < 0
        # With threshold=5: (10-5)*(3-5) = 5*(-2) = -10 < 0 → crossover between 0 and 1
        call_idx = 0

        async def mock_calculate(self_inner, payload):
            nonlocal call_idx
            margins = [10.0, 3.0, -4.0]
            margin = margins[call_idx]
            call_idx += 1
            return {
                "results": {
                    "uplink": {"cn_db": 15.0, "rain_loss_db": 1.0, "link_margin_db": margin},
                    "downlink": {"cn_db": 14.0, "rain_loss_db": 0.5, "link_margin_db": margin},
                    "combined": {},
                },
                "combined_link_margin_db": margin,
                "combined_cn_db": 12.0,
                "combined_cn0_dbhz": 87.0,
                "modcod_selected": None,
            }

        from src.services.calculation_service import CalculationService

        with patch.object(CalculationService, "calculate", mock_calculate):
            result = await service.execute(
                base_payload={
                    "waveform_strategy": "DVB_S2X",
                    "transponder_type": "TRANSPARENT",
                    "runtime": {
                        "uplink": {"rain_rate_mm_per_hr": 0},
                        "downlink": {"rain_rate_mm_per_hr": 0},
                    },
                },
                sweep_config=config,
                threshold_db=5.0,
            )

        assert result.crossover_value is not None
        # Between point 0 (value=0, margin=10) and point 1 (value=50, margin=3)
        # ratio = (5 - 10) / (3 - 10) = -5 / -7 = 5/7
        # crossover = 0 + (5/7) * (50 - 0) = 250/7 ≈ 35.71
        assert pytest.approx(result.crossover_value, rel=0.01) == 250 / 7
