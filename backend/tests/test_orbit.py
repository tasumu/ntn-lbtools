"""Tests for TLE orbit propagation module."""

from datetime import UTC, datetime

import pytest

from src.core.orbit import SatellitePosition, compute_look_angles, propagate_tle

# ISS TLE (epoch 2024-01-01, used as a well-known test case)
ISS_NAME = "ISS (ZARYA)"
ISS_TLE_LINE1 = "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9003"
ISS_TLE_LINE2 = "2 25544  51.6400 208.9163 0006703 300.0286  60.0024 15.49560722999999"


class TestPropagateTle:
    def test_returns_satellite_position(self):
        """propagate_tle returns a SatellitePosition with valid ranges."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        assert isinstance(pos, SatellitePosition)
        assert -90 <= pos.latitude_deg <= 90
        assert -180 <= pos.longitude_deg <= 180
        assert pos.altitude_km > 0

    def test_iss_altitude_range(self):
        """ISS altitude should be roughly 400-430 km."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        assert 350 < pos.altitude_km < 500, (
            f"ISS altitude {pos.altitude_km:.1f} km outside expected range"
        )

    def test_iss_inclination_constraint(self):
        """ISS latitude should be within its inclination (±51.6 deg)."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        assert abs(pos.latitude_deg) <= 52.0, (
            f"ISS latitude {pos.latitude_deg:.1f} exceeds orbital inclination"
        )

    def test_different_times_give_different_positions(self):
        """Satellite position changes over time."""
        t1 = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        t2 = datetime(2024, 1, 1, 12, 30, 0, tzinfo=UTC)
        pos1 = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t1)
        pos2 = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t2)

        # After 30 minutes ISS moves significantly
        assert pos1.longitude_deg != pos2.longitude_deg or pos1.latitude_deg != pos2.latitude_deg

    def test_default_time_is_now(self):
        """When computation_time is None, uses current time (should not raise)."""
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, None)
        assert isinstance(pos, SatellitePosition)
        assert pos.altitude_km > 0

    def test_invalid_tle_raises(self):
        """Invalid TLE format raises ValueError."""
        with pytest.raises(ValueError, match="TLE"):
            propagate_tle("INVALID LINE 1", "INVALID LINE 2", "BAD", datetime.now(UTC))

    def test_epoch_is_set(self):
        """SatellitePosition includes TLE epoch."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        assert pos.epoch is not None
        # ISS TLE epoch is near 2024-01-01
        assert pos.epoch.year == 2024


class TestComputeLookAngles:
    def test_visible_pass(self):
        """When satellite is visible, elevation > 0 and slant range > 0."""
        # Use a ground station roughly below ISS orbit path
        # ISS passes over lat ~40N regularly
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        # Place ground station at the sub-satellite point for guaranteed visibility
        elev, az, slant = compute_look_angles(
            ISS_TLE_LINE1,
            ISS_TLE_LINE2,
            ISS_NAME,
            pos.latitude_deg,
            pos.longitude_deg,
            0.0,
            t,
        )
        assert elev > 0, f"Elevation {elev:.1f} deg should be positive at sub-satellite point"
        assert slant > 0, f"Slant range {slant:.1f} km should be positive"
        assert 0 <= az <= 360, f"Azimuth {az:.1f} deg out of range"

    def test_subsatellite_point_near_90deg(self):
        """At the sub-satellite point, elevation should be near 90 degrees."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        elev, _, slant = compute_look_angles(
            ISS_TLE_LINE1,
            ISS_TLE_LINE2,
            ISS_NAME,
            pos.latitude_deg,
            pos.longitude_deg,
            0.0,
            t,
        )
        assert elev > 80, f"Elevation at sub-sat point should be near 90, got {elev:.1f}"
        assert slant < 500, f"Slant range at sub-sat should be ~altitude, got {slant:.1f}"

    def test_distant_station_low_elevation(self):
        """A distant ground station should have lower elevation."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        # Offset ground station 15 degrees in latitude
        elev_near, _, slant_near = compute_look_angles(
            ISS_TLE_LINE1,
            ISS_TLE_LINE2,
            ISS_NAME,
            pos.latitude_deg,
            pos.longitude_deg,
            0.0,
            t,
        )
        elev_far, _, slant_far = compute_look_angles(
            ISS_TLE_LINE1,
            ISS_TLE_LINE2,
            ISS_NAME,
            pos.latitude_deg + 15.0,
            pos.longitude_deg,
            0.0,
            t,
        )
        assert elev_far < elev_near, "Farther station should have lower elevation"
        assert slant_far > slant_near, "Farther station should have longer slant range"

    def test_slant_range_order_of_magnitude(self):
        """LEO slant range should be much shorter than GEO (~35786 km)."""
        t = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        pos = propagate_tle(ISS_TLE_LINE1, ISS_TLE_LINE2, ISS_NAME, t)

        _, _, slant = compute_look_angles(
            ISS_TLE_LINE1,
            ISS_TLE_LINE2,
            ISS_NAME,
            pos.latitude_deg,
            pos.longitude_deg,
            0.0,
            t,
        )
        assert slant < 3000, f"LEO slant range {slant:.0f} km should be << GEO 35786 km"

    def test_invalid_tle_raises(self):
        """Invalid TLE in compute_look_angles raises ValueError."""
        with pytest.raises(ValueError, match="TLE"):
            compute_look_angles(
                "BAD LINE 1",
                "BAD LINE 2",
                "BAD",
                35.0,
                139.0,
                0.0,
                datetime.now(UTC),
            )
