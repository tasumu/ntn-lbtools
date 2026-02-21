
import math
from unittest.mock import patch

import pytest

from src.core.propagation import (
    FSPL_CONST_4PI_OVER_C_DB,
    GEO_ALTITUDE_KM,
    KB,
    LinkBudgetInputs,
    compute_link_budget,
    estimate_slant_range_km,
    free_space_path_loss_db,
    pointing_loss_db,
)

# --- FSPL Tests ---

def test_fspl_calculation():
    """
    Verify FSPL calculation against a known manual calculation.
    FSPL(dB) = 20log10(d) + 20log10(f) + 20log10(4pi/c)
             = 20log10(d) + 20log10(f) - 147.55
    """
    freq_hz = 10e9  # 10 GHz
    dist_km = 36000 # 36,000 km
    
    # Manual check
    # 20log10(3.6e7) = 20 * 7.5563 = 151.126
    # 20log10(10e9)  = 20 * 10 = 200
    # Constant ~ -147.55
    # Total ~ 203.57 dB
    
    fspl = free_space_path_loss_db(freq_hz, dist_km)
    
    # Calculate expected using the constant exported from module to be consistent with precision
    # d in meters
    d_m = dist_km * 1000.0
    expected = 20 * math.log10(d_m) + 20 * math.log10(freq_hz) + FSPL_CONST_4PI_OVER_C_DB
    
    assert math.isclose(fspl, expected, abs_tol=1e-5)
    
    # Sanity range check for GEO Ku-band (approx 200-210 dB)
    assert 190.0 < fspl < 220.0

# --- Slant Range Tests ---

def test_slant_range_subsatellite():
    """
    Ground station directly under satellite (Sub-satellite point).
    Range should be exactly Altitude.
    """
    # Satellite at 0 deg long
    # Ground at 0 lat, 0 long
    range_km = estimate_slant_range_km(0.0, 0.0, 0.0, 0.0)
    assert math.isclose(range_km, GEO_ALTITUDE_KM, abs_tol=1.0)

def test_slant_range_geometric_fallback():
    """
    Force use of spherical geometry fallback (by ensuring skyfield doesn't interfere or mocking it).
    We test a known simple triangle or just non-zero lat.
    """
    # If we are 90 degrees away (e.g. North Pole), distance is sqrt(Re^2 + Rs^2)
    # Re ~ 6371, Rs ~ 42164 (6371+35786)
    # This is a bit rough due to spherical approx but should be close.
    with patch("src.core.propagation.wgs84", None):
        range_km = estimate_slant_range_km(90.0, 0.0, 0.0, 0.0)
        
        re = 6371.0
        rs = 42164.0
        expected = math.sqrt(re**2 + rs**2) # approx 42642 km
        
        assert math.isclose(range_km, expected, rel_tol=0.01)

# --- Pointing Loss Tests ---

def test_pointing_loss():
    assert pointing_loss_db(25.0) == 0.1
    assert pointing_loss_db(15.0) == 0.5
    assert pointing_loss_db(20.0) == 0.5 # Boundary condition

# --- Link Budget Calculation Tests ---

def test_compute_link_budget_math():
    """
    Verify the summation logic in compute_link_budget.
    C/N0 = EIRP + G/T - Losses - k
    """
    inputs = LinkBudgetInputs(
        frequency_hz=10e9,
        bandwidth_hz=1e6, # 1 MHz -> 60 dBHz bandwidth factor
        elevation_deg=30.0,
        rain_rate_mm_per_hr=0.0,
        tx_eirp_dbw=50.0,
        rx_gt_db_per_k=20.0,
        ground_lat_deg=0.0,
        ground_lon_deg=0.0,
        ground_alt_m=0.0,
        sat_longitude_deg=0.0,
        temperature_k=290.0,
    )
    
    # Mock the ITU models to return deterministic 0 or known small values
    with patch("src.core.propagation.rain_loss_db", return_value=0.5), \
         patch("src.core.propagation.gas_loss_db", return_value=0.5), \
         patch("src.core.propagation.cloud_loss_db", return_value=0.5), \
         patch("src.core.propagation.estimate_slant_range_km", return_value=36000.0):  # noqa: E501
         
        results = compute_link_budget(inputs)
        
        fspl = free_space_path_loss_db(10e9, 36000.0)
        pointing = pointing_loss_db(30.0) # 0.1
        
        total_loss = fspl + 0.5 + 0.5 + 0.5 + pointing
        
        # C/N0 = 50 + 20 - TotalLoss - (-228.6)
        expected_cn0 = 50.0 + 20.0 - total_loss - KB
        expected_cn = expected_cn0 - 10 * math.log10(1e6)
        
        assert math.isclose(results["atm_loss_db"], total_loss, abs_tol=1e-5)
        assert math.isclose(results["cn0_dbhz"], expected_cn0, abs_tol=1e-5)
        assert math.isclose(results["cn_db"], expected_cn, abs_tol=1e-5)

def test_compute_link_budget_handles_itu_error():
    """
    If ITU models raise error, it should be propagated (or handled).
    The current code raises RuntimeError.
    """
    inputs = LinkBudgetInputs(
        frequency_hz=10e9,
        bandwidth_hz=1e6,
        elevation_deg=30.0,
        rain_rate_mm_per_hr=10.0,
        tx_eirp_dbw=50.0,
        rx_gt_db_per_k=20.0,
        ground_lat_deg=0.0,
        ground_lon_deg=0.0,
        ground_alt_m=0.0,
        sat_longitude_deg=0.0,
        temperature_k=290.0,
    )
    
    with patch("src.core.propagation.rain_loss_db", side_effect=RuntimeError("ITU Error")):
        with pytest.raises(RuntimeError):
            compute_link_budget(inputs)
