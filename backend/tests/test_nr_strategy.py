# ruff: noqa: E402
import math
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.core.strategies.dvbs2x import ModcodEntry  # type: ignore  # noqa: E402
from src.core.strategies.nr import NrStrategy  # type: ignore  # noqa: E402

# ---------------------------------------------------------------------------
# Strategy identity
# ---------------------------------------------------------------------------


def test_nr_strategy_name():
    strat = NrStrategy()
    assert strat.name == "5G_NR"


# ---------------------------------------------------------------------------
# Overhead / spectral efficiency
# ---------------------------------------------------------------------------


def test_nr_default_overhead_is_0_14():
    assert NrStrategy.default_overhead == 0.14


def test_nr_effective_spectral_efficiency_uses_overhead():
    entry = ModcodEntry(
        id="qpsk-0.5",
        modulation="QPSK",
        code_rate="1/2",
        info_bits_per_symbol=1.0,
    )
    strat = NrStrategy(table=[entry])
    eff = strat.effective_spectral_efficiency(entry, rolloff=0.14)
    assert eff == pytest.approx(1.0 * (1 - 0.14))


def test_nr_effective_spectral_efficiency_custom_overhead():
    entry = ModcodEntry(
        id="16qam-0.5",
        modulation="16QAM",
        code_rate="1/2",
        info_bits_per_symbol=2.0,
    )
    strat = NrStrategy(table=[entry])
    eff = strat.effective_spectral_efficiency(entry, rolloff=0.10)
    assert eff == pytest.approx(2.0 * 0.90)


def test_nr_effective_spectral_efficiency_entry_rolloff_as_overhead():
    """When entry.rolloff is set, it serves as overhead for NR."""
    entry = ModcodEntry(
        id="64qam-0.75",
        modulation="64QAM",
        code_rate="3/4",
        info_bits_per_symbol=4.5,
        rolloff=0.12,
    )
    strat = NrStrategy(table=[entry])
    # No explicit rolloff argument → use entry.rolloff as overhead
    eff = strat.effective_spectral_efficiency(entry, rolloff=None)
    assert eff == pytest.approx(4.5 * (1 - 0.12))


def test_nr_effective_spectral_efficiency_default_overhead_fallback():
    """When neither rolloff arg nor entry.rolloff is provided, use default."""
    entry = ModcodEntry(
        id="qpsk-1/3",
        modulation="QPSK",
        code_rate="1/3",
        info_bits_per_symbol=0.67,
    )
    strat = NrStrategy(table=[entry])
    eff = strat.effective_spectral_efficiency(entry, rolloff=None)
    assert eff == pytest.approx(0.67 * (1 - 0.14))


def test_nr_overhead_clamped_to_0_1():
    """Overhead should be clamped between 0.0 and 1.0."""
    entry = ModcodEntry(
        id="qpsk-1/2",
        modulation="QPSK",
        code_rate="1/2",
        info_bits_per_symbol=1.0,
    )
    strat = NrStrategy(table=[entry])

    # Negative overhead → clamped to 0.0 → SE = info_bits * 1.0
    eff_neg = strat.effective_spectral_efficiency(entry, rolloff=-0.5)
    assert eff_neg == pytest.approx(1.0)

    # Overhead > 1.0 → clamped to 1.0 → SE = info_bits * 0.0
    eff_over = strat.effective_spectral_efficiency(entry, rolloff=1.5)
    assert eff_over == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Spectral efficiency (aggregate)
# ---------------------------------------------------------------------------


def test_nr_spectral_efficiency_uses_highest_entry():
    table = [
        ModcodEntry("low", "QPSK", "1/4", required_cn0_dbhz=60.0, info_bits_per_symbol=0.5),
        ModcodEntry("high", "64QAM", "3/4", required_cn0_dbhz=80.0, info_bits_per_symbol=4.5),
    ]
    strat = NrStrategy(table=table)
    eff = strat.spectral_efficiency()
    assert eff == pytest.approx(4.5 * (1 - 0.14))


# ---------------------------------------------------------------------------
# ModCod selection (uses shared base logic)
# ---------------------------------------------------------------------------


def test_nr_modcod_selection_picks_highest_meeting_threshold():
    table = [
        ModcodEntry("mcs0", "QPSK", "1/4", required_cn0_dbhz=60.0, info_bits_per_symbol=0.5),
        ModcodEntry("mcs5", "QPSK", "1/2", required_cn0_dbhz=70.0, info_bits_per_symbol=1.0),
        ModcodEntry("mcs15", "64QAM", "3/4", required_cn0_dbhz=78.0, info_bits_per_symbol=4.5),
    ]
    strat = NrStrategy(table=table)
    assert strat.select_modcod(65.0).id == "mcs0"
    assert strat.select_modcod(72.0).id == "mcs5"
    assert strat.select_modcod(80.0).id == "mcs15"


def test_nr_modcod_selection_with_bandwidth():
    table = [
        ModcodEntry("mcs0", "QPSK", "1/4", required_ebno_db=-2.0, info_bits_per_symbol=0.5),
        ModcodEntry("mcs10", "16QAM", "1/2", required_ebno_db=4.0, info_bits_per_symbol=2.0),
    ]
    strat = NrStrategy(table=table)
    bandwidth_hz = 10e6
    # High CN0 → should pick mcs10
    selected = strat.select_modcod(90.0, bandwidth_hz=bandwidth_hz, rolloff=0.14)
    assert selected.id == "mcs10"
    # Low CN0 → should pick mcs0
    selected = strat.select_modcod(60.0, bandwidth_hz=bandwidth_hz, rolloff=0.14)
    assert selected.id == "mcs0"


def test_nr_select_modcod_with_margin():
    entry = ModcodEntry(
        "mcs5",
        "QPSK",
        "1/2",
        required_ebno_db=1.0,
        info_bits_per_symbol=1.0,
    )
    strat = NrStrategy(table=[entry])
    bandwidth_hz = 10e6
    cn0 = 80.0

    selected, available_ebno, required_ebno, margin, bitrate = strat.select_modcod_with_margin(
        cn0, bandwidth_hz, rolloff=0.14
    )
    assert selected is not None
    assert selected.id == "mcs5"
    assert bitrate is not None
    assert bitrate == pytest.approx(bandwidth_hz * 1.0 * (1 - 0.14))
    expected_available_ebno = cn0 - 10 * math.log10(bitrate)
    assert available_ebno == pytest.approx(expected_available_ebno)
    assert margin is not None
    assert margin > 0


# ---------------------------------------------------------------------------
# Table initialization from dicts
# ---------------------------------------------------------------------------


def test_nr_table_from_dicts():
    entries = [
        {
            "id": "mcs0",
            "modulation": "QPSK",
            "code_rate": "120/1024",
            "required_ebno_db": -6.7,
            "info_bits_per_symbol": 0.2344,
        },
        {
            "id": "mcs10",
            "modulation": "16QAM",
            "code_rate": "340/1024",
            "required_ebno_db": 2.0,
            "info_bits_per_symbol": 1.3281,
        },
    ]
    strat = NrStrategy(table=entries)
    assert len(strat.table) == 2
    assert strat.table[0].id == "mcs0"
    assert strat.table[1].modulation == "16QAM"


def test_nr_infers_info_bits_per_symbol():
    """When info_bits_per_symbol is not provided, infer from modulation * code_rate."""
    entry_dict = {
        "id": "mcs-legacy",
        "modulation": "64QAM",
        "code_rate": "3/4",
        "required_ebno_db": 10.0,
    }
    strat = NrStrategy(table=[entry_dict])
    entry = strat.table[0]
    # 64QAM = 6 bits, 3/4 rate → 4.5
    assert entry.info_bits_per_symbol == pytest.approx(6.0 * 0.75)


# ---------------------------------------------------------------------------
# DVB-S2X vs NR spectral efficiency comparison
# ---------------------------------------------------------------------------


def test_nr_se_differs_from_dvbs2x():
    """NR uses (1-overhead) multiplication vs DVB-S2X (1+rolloff) division."""
    from src.core.strategies.dvbs2x import DvbS2xStrategy

    entry = ModcodEntry(
        id="qpsk-1/2",
        modulation="QPSK",
        code_rate="1/2",
        info_bits_per_symbol=1.0,
    )
    nr = NrStrategy(table=[entry])
    dvb = DvbS2xStrategy(table=[entry])

    nr_se = nr.effective_spectral_efficiency(entry, rolloff=0.2)
    dvb_se = dvb.effective_spectral_efficiency(entry, rolloff=0.2)

    # NR: 1.0 * (1 - 0.2) = 0.8
    assert nr_se == pytest.approx(0.8)
    # DVB-S2X: 1.0 / (1 + 0.2) ≈ 0.833
    assert dvb_se == pytest.approx(1.0 / 1.2)
    # They should differ
    assert nr_se != pytest.approx(dvb_se)
