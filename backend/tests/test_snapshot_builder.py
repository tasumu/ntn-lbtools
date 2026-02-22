"""Tests for snapshot_builder — LEO parameter persistence."""

from src.core.models.common import LinkDirectionParameters, RuntimeParameters
from src.services.snapshot_builder import build_payload_snapshot, build_runtime_echo


def _make_direction(**overrides):
    defaults = {
        "frequency_hz": 14.25e9,
        "bandwidth_hz": 36e6,
        "elevation_deg": 35.0,
        "rain_rate_mm_per_hr": 10.0,
        "temperature_k": 290.0,
        "ground_lat_deg": 35.0,
        "ground_lon_deg": 139.0,
        "ground_alt_m": 0.0,
    }
    defaults.update(overrides)
    return LinkDirectionParameters(**defaults)


def _make_runtime(**overrides):
    defaults = {
        "sat_longitude_deg": 140.0,
        "sat_latitude_deg": 0.0,
        "sat_altitude_km": 35786.0,
        "uplink": _make_direction(),
        "downlink": _make_direction(frequency_hz=12e9),
    }
    defaults.update(overrides)
    return RuntimeParameters(**defaults)


class TestBuildRuntimeEchoLeoFields:
    """build_runtime_echo must include LEO-specific fields."""

    def test_includes_sat_latitude_and_altitude(self):
        runtime = _make_runtime(sat_latitude_deg=35.5, sat_altitude_km=550.0)

        echo = build_runtime_echo(
            runtime,
            rolloff=0.25,
            uplink_data={},
            downlink_data={},
            intermod_block=None,
            shared_bandwidth=36e6,
            is_transparent=True,
            computation_datetime="2024-12-15T10:30:00+00:00",
        )

        assert echo["sat_latitude_deg"] == 35.5
        assert echo["sat_altitude_km"] == 550.0
        assert echo["computation_datetime"] == "2024-12-15T10:30:00+00:00"
        assert echo["sat_longitude_deg"] == 140.0

    def test_computation_datetime_optional(self):
        runtime = _make_runtime()

        echo = build_runtime_echo(
            runtime,
            rolloff=0.25,
            uplink_data={},
            downlink_data={},
            intermod_block=None,
            shared_bandwidth=None,
            is_transparent=False,
        )

        assert echo.get("computation_datetime") is None
        assert "sat_latitude_deg" in echo
        assert "sat_altitude_km" in echo

    def test_geo_defaults_preserved(self):
        """GEO runtime uses default lat=0 and alt=35786."""
        runtime = _make_runtime()

        echo = build_runtime_echo(
            runtime,
            rolloff=None,
            uplink_data={},
            downlink_data={},
            intermod_block=None,
            shared_bandwidth=None,
            is_transparent=False,
        )

        assert echo["sat_latitude_deg"] == 0.0
        assert echo["sat_altitude_km"] == 35786.0


class TestPayloadSnapshotLeoFields:
    """LEO fields must survive full snapshot building with runtime_echo override."""

    def test_snapshot_runtime_preserves_leo_fields(self):
        runtime = _make_runtime(sat_latitude_deg=35.5, sat_altitude_km=550.0)

        runtime_echo = build_runtime_echo(
            runtime,
            rolloff=0.25,
            uplink_data={},
            downlink_data={},
            intermod_block=None,
            shared_bandwidth=36e6,
            is_transparent=True,
            computation_datetime="2024-12-15T10:30:00+00:00",
        )

        snapshot = build_payload_snapshot(
            payload={},
            runtime=runtime,
            runtime_echo=runtime_echo,
            sat=None,
            tx_es=None,
            rx_es=None,
            common_modcod_table=None,
            uplink_modcod_table=None,
            downlink_modcod_table=None,
            waveform=None,
            sat_id=None,
            tx_id=None,
            rx_id=None,
            clean_overrides=None,
        )

        # Simulate calculation_service.py line 548: payload_snapshot["runtime"] = runtime_echo
        snapshot["runtime"] = runtime_echo

        assert snapshot["runtime"]["sat_latitude_deg"] == 35.5
        assert snapshot["runtime"]["sat_altitude_km"] == 550.0
        assert snapshot["runtime"]["computation_datetime"] == "2024-12-15T10:30:00+00:00"
