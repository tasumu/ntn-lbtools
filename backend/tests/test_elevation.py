"""Tests for generalized elevation angle computation."""

import math

from src.core.elevation import compute_elevation, compute_geo_elevation

GEO_ALT_KM = 35786.0


class TestComputeElevation:
    def test_geo_equivalent(self):
        """compute_elevation with GEO params matches compute_geo_elevation."""
        sat_lon, ground_lat, ground_lon, ground_alt = 140.0, 35.0, 139.0, 50.0
        geo_elev = compute_geo_elevation(sat_lon, ground_lat, ground_lon, ground_alt)
        gen_elev = compute_elevation(
            sat_lat_deg=0.0,
            sat_lon_deg=sat_lon,
            sat_alt_km=GEO_ALT_KM,
            ground_lat_deg=ground_lat,
            ground_lon_deg=ground_lon,
            ground_alt_m=ground_alt,
        )
        assert math.isclose(geo_elev, gen_elev, abs_tol=0.5), (
            f"GEO elevation {geo_elev:.2f} != general {gen_elev:.2f}"
        )

    def test_geo_equivalent_different_locations(self):
        """Test GEO equivalence at different ground station locations."""
        test_cases = [
            (128.0, 0.0, 100.0, 0.0),      # Equator, near sub-sat
            (128.0, 50.0, 0.0, 100.0),      # High latitude Europe
            (128.0, -30.0, 151.0, 0.0),     # Sydney
        ]
        for sat_lon, ground_lat, ground_lon, ground_alt in test_cases:
            geo_elev = compute_geo_elevation(sat_lon, ground_lat, ground_lon, ground_alt)
            gen_elev = compute_elevation(
                0.0, sat_lon, GEO_ALT_KM, ground_lat, ground_lon, ground_alt,
            )
            assert math.isclose(geo_elev, gen_elev, abs_tol=0.5), (
                f"Mismatch at ({ground_lat}, {ground_lon}): GEO={geo_elev:.2f}, Gen={gen_elev:.2f}"
            )

    def test_subsatellite_point_is_90_deg(self):
        """Elevation at the sub-satellite point should be 90 degrees."""
        elev = compute_elevation(
            sat_lat_deg=35.0,
            sat_lon_deg=139.0,
            sat_alt_km=550.0,
            ground_lat_deg=35.0,
            ground_lon_deg=139.0,
            ground_alt_m=0.0,
        )
        assert math.isclose(elev, 90.0, abs_tol=0.1), (
            f"Sub-satellite elevation should be 90, got {elev:.2f}"
        )

    def test_leo_550km_typical(self):
        """LEO satellite at 550km altitude should give reasonable elevation."""
        # Ground station 5 degrees away from sub-satellite point
        elev = compute_elevation(
            sat_lat_deg=35.0,
            sat_lon_deg=139.0,
            sat_alt_km=550.0,
            ground_lat_deg=30.0,
            ground_lon_deg=139.0,
            ground_alt_m=0.0,
        )
        # At 5 degrees away and 550km altitude, elevation should be moderate
        assert 0 < elev < 90, f"LEO elevation {elev:.2f} should be between 0 and 90"

    def test_leo_higher_elevation_than_far(self):
        """Closer station has higher elevation."""
        near_elev = compute_elevation(35.0, 139.0, 550.0, 34.0, 139.0, 0.0)
        far_elev = compute_elevation(35.0, 139.0, 550.0, 25.0, 139.0, 0.0)
        assert near_elev > far_elev, "Closer station should have higher elevation"

    def test_below_horizon_returns_negative(self):
        """Station very far from satellite should give negative elevation."""
        elev = compute_elevation(
            sat_lat_deg=35.0,
            sat_lon_deg=139.0,
            sat_alt_km=550.0,
            ground_lat_deg=-60.0,
            ground_lon_deg=139.0,
            ground_alt_m=0.0,
        )
        assert elev < 0, f"Far station elevation should be negative, got {elev:.2f}"

    def test_haps_20km(self):
        """HAPS at 20km altitude should have very limited coverage."""
        # Station directly below
        elev_below = compute_elevation(35.0, 139.0, 20.0, 35.0, 139.0, 0.0)
        assert math.isclose(elev_below, 90.0, abs_tol=0.1)

        # Station 1 degree away (~111 km) - should be very low
        elev_near = compute_elevation(35.0, 139.0, 20.0, 36.0, 139.0, 0.0)
        assert elev_near < 15, f"HAPS elevation at 1 deg offset should be low, got {elev_near:.2f}"

    def test_altitude_increases_elevation(self):
        """Higher orbit altitude should increase elevation for same geometry."""
        elev_low = compute_elevation(35.0, 139.0, 550.0, 30.0, 139.0, 0.0)
        elev_high = compute_elevation(35.0, 139.0, 1200.0, 30.0, 139.0, 0.0)
        assert elev_high > elev_low, "Higher altitude should give higher elevation"
