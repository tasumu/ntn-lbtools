# ruff: noqa: E402
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from itur.models import itu618, itu676  # type: ignore  # noqa: E402

from src.core.propagation import (  # type: ignore  # noqa: E402
    LinkBudgetInputs,
    compute_link_budget,
    rain_loss_db,
)
from src.core.strategies.dvbs2x import DvbS2xStrategy, ModcodEntry  # type: ignore  # noqa: E402


def test_modcod_selection_picks_highest_meeting_threshold():
    table = [
        ModcodEntry(
            id="low", modulation="QPSK", code_rate="1/4",
            required_cn0_dbhz=60.0, info_bits_per_symbol=0.5,
        ),
        ModcodEntry(
            id="mid", modulation="QPSK", code_rate="1/2",
            required_cn0_dbhz=70.0, info_bits_per_symbol=1.0,
        ),
        ModcodEntry(
            id="high", modulation="8PSK", code_rate="3/4",
            required_cn0_dbhz=78.0, info_bits_per_symbol=2.25,
        ),
    ]
    strat = DvbS2xStrategy(table=table)
    assert strat.select_modcod(65.0).id == "low"
    assert strat.select_modcod(72.0).id == "mid"
    assert strat.select_modcod(80.0).id == "high"


def test_modcod_infers_info_bits_per_symbol():
    legacy_entry = {
        "id": "legacy",
        "modulation": "16APSK",
        "code_rate": "5/6",
        "required_cn0_dbhz": 80.0,
    }
    strat = DvbS2xStrategy(table=[legacy_entry])
    entry = strat.table[0]
    assert entry.info_bits_per_symbol == pytest.approx(4.0 * (5.0 / 6.0))


def test_compute_link_budget_basic_numbers():
    inputs = LinkBudgetInputs(
        frequency_hz=14.25e9,
        bandwidth_hz=36e6,
        elevation_deg=45,
        rain_rate_mm_per_hr=0,
        tx_eirp_dbw=50,
        rx_gt_db_per_k=25,
        ground_lat_deg=0,
        ground_lon_deg=0,
        ground_alt_m=0,
        sat_longitude_deg=0,
        temperature_k=290,
    )
    results = compute_link_budget(inputs)
    assert pytest.approx(results["fspl_db"], rel=0.001) == 206.6
    assert pytest.approx(results["rain_loss_db"], rel=0.001) == 0.0
    gas_ref = itu676.gaseous_attenuation_slant_path(
        inputs.frequency_hz / 1e9,
        inputs.elevation_deg,
        rho=inputs.water_vapor_density,
        P=inputs.pressure_hpa,
        T=inputs.temperature_k,
        mode="approx",
    ).value
    assert pytest.approx(results["gas_loss_db"], rel=0.01) == gas_ref
    assert "cn0_dbhz" in results and "link_margin_db" in results


def test_rain_loss_matches_itu618_reference():
    rain_rate = 25.0
    elevation = 35.0
    lat = 35.0
    lon = 139.0
    alt_m = 0.0
    freq_hz = 20e9
    expected = itu618.rain_attenuation(
        lat,
        lon,
        freq_hz / 1e9,
        elevation,
        hs=alt_m / 1000,
        R001=rain_rate,
    ).value
    assert rain_loss_db(rain_rate, elevation, lat, lon, alt_m, freq_hz) == pytest.approx(expected)


def test_effective_spectral_efficiency_uses_rolloff():
    entry = ModcodEntry(
        id="qpsk-1/2",
        modulation="QPSK",
        code_rate="1/2",
        info_bits_per_symbol=1.0,
    )
    strat = DvbS2xStrategy(table=[entry])
    eff = strat.effective_spectral_efficiency(entry, rolloff=0.35)
    assert eff == pytest.approx(1.0 / 1.35)


def test_legacy_extra_fields_are_ignored():
    legacy_dict = {
        "id": "legacy",
        "modulation": "QPSK",
        "code_rate": "1/2",
        "required_cn0_dbhz": 70.0,
        "spectral_efficiency": 0.83,  # ignored
        "info_bits_per_symbol": 1.0,
    }
    strat = DvbS2xStrategy(table=[legacy_dict])
    entry = strat.table[0]
    assert entry.info_bits_per_symbol == 1.0
    eff = strat.effective_spectral_efficiency(entry, rolloff=0.35)
    assert eff == pytest.approx(1.0 / 1.35)
