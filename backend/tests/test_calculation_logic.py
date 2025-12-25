import copy
import math
import uuid
from dataclasses import dataclass, field
from typing import Any

import pytest

from src.core.strategies.dvbs2x import ModcodEntry
from src.services.calculation_service import CalculationService

# --- Mocks and Helpers ---

@dataclass
class FakeEntity:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "Test Entity"

@dataclass
class FakeSatellite(FakeEntity):
    longitude_deg: float = 0.0
    orbit_type: str = "GEO"
    eirp_dbw: float = 50.0
    gt_db_per_k: float = 10.0
    transponder_bandwidth_mhz: float = 36.0

@dataclass
class FakeStation(FakeEntity):
    antenna_gain_tx_db: float = 40.0
    antenna_gain_rx_db: float = 40.0
    tx_power_dbw: float = 10.0
    noise_temperature_k: float = 100.0
    eirp_dbw: float | None = None
    gt_db_per_k: float | None = None

@dataclass
class FakeModCodTable(FakeEntity):
    entries: list[Any] = field(default_factory=list)
    version: str = "1.0"

class FakeRepo:
    def __init__(self, items=None):
        self.items = items or {}

    async def get(self, item_id):
        return self.items.get(item_id)

# --- Test Data ---

@pytest.fixture
def mock_modcod_entries():
    return [
        ModcodEntry(
            id="QPSK_1/4", modulation="QPSK", code_rate="1/4", 
            required_ebno_db=1.0, info_bits_per_symbol=0.5, rolloff=0.2,
        ),
        ModcodEntry(
            id="QPSK_1/2", modulation="QPSK", code_rate="1/2", 
            required_ebno_db=3.0, info_bits_per_symbol=1.0, rolloff=0.2,
        ),
        ModcodEntry(
            id="8PSK_3/4", modulation="8PSK", code_rate="3/4", 
            required_ebno_db=6.0, info_bits_per_symbol=2.25, rolloff=0.2,
        ),
    ]

@pytest.fixture
def base_payload(mock_modcod_entries):
    sat_id = uuid.uuid4()
    tx_id = uuid.uuid4()
    rx_id = uuid.uuid4()
    mc_id = uuid.uuid4()
    
    return {
        "waveform_strategy": "DVB_S2X",
        "transponder_type": "TRANSPARENT",
        "modcod_table_id": mc_id,
        "satellite_id": sat_id,
        "earth_station_tx_id": tx_id,
        "earth_station_rx_id": rx_id,
        "runtime": {
            "sat_longitude_deg": 0.0,
            "bandwidth_hz": 10e6, # 10 MHz
            "uplink": {
                "frequency_hz": 14e9, # 14 GHz
                "bandwidth_hz": 10e6,
                "elevation_deg": 45.0,
                "rain_rate_mm_per_hr": 0.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 0.0,
                "ground_lon_deg": 0.0,
                "ground_alt_m": 0.0,
            },
            "downlink": {
                "frequency_hz": 12e9, # 12 GHz
                "bandwidth_hz": 10e6,
                "elevation_deg": 45.0,
                "rain_rate_mm_per_hr": 0.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 0.0,
                "ground_lon_deg": 0.0,
                "ground_alt_m": 0.0,
            },
        },
        # Internal test data, not part of payload but used to setup service
        "_mocks": {
            "sat": FakeSatellite(id=sat_id, eirp_dbw=60.0, gt_db_per_k=5.0),
            "tx": FakeStation(id=tx_id, tx_power_dbw=20.0, antenna_gain_tx_db=40.0), # EIRP = 60
            "rx": FakeStation(id=rx_id, antenna_gain_rx_db=30.0, noise_temperature_k=200.0), # G/T approx 30 - 23 = 7
            "modcod": FakeModCodTable(id=mc_id, entries=mock_modcod_entries),
        },
    }

@pytest.fixture
def calculation_service(base_payload):
    mocks = base_payload.pop("_mocks")
    
    sat_repo = FakeRepo({mocks["sat"].id: mocks["sat"]})
    es_repo = FakeRepo({mocks["tx"].id: mocks["tx"], mocks["rx"].id: mocks["rx"]})
    modcod_repo = FakeRepo({mocks["modcod"].id: mocks["modcod"]})
    
    return CalculationService(
        modcod_repo=modcod_repo,
        satellite_repo=sat_repo,
        earth_station_repo=es_repo,
    )

# --- Tests ---

@pytest.mark.asyncio
async def test_calculate_transparent_success(calculation_service, base_payload):
    """
    Verify a basic successful calculation for Transparent Transponder.
    Check if C/N, C/N0, and Link Margin are calculated and non-negative (given the strong link setup).
    """
    result = await calculation_service.calculate(base_payload)
    
    assert result["strategy"]["transponder_type"] == "TRANSPARENT"
    assert result["combined_cn_db"] is not None
    assert result["combined_link_margin_db"] is not None
    
    # Check that we selected a ModCod
    assert result["modcod_selected"] is not None
    assert "id" in result["modcod_selected"]
    
    # Basic sanity checks on values
    # Given: TX EIRP 50, Sat G/T 5 => Uplink C/N should be decent
    # Sat EIRP 50, RX G/T ~7 => Downlink C/N should be decent
    # We expect a positive margin with QPSK 1/4 (Req Eb/N0 = 1.0)
    assert result["combined_link_margin_db"] > 0


@pytest.mark.asyncio
async def test_calculate_defaults_temperature(calculation_service, base_payload):
    payload = copy.deepcopy(base_payload)
    payload["runtime"]["uplink"]["temperature_k"] = None
    payload["runtime"]["downlink"]["temperature_k"] = None

    result = await calculation_service.calculate(payload)

    assert result["results"]["uplink"]["cn0_dbhz"] is not None
    assert result["results"]["downlink"]["cn0_dbhz"] is not None

@pytest.mark.asyncio
async def test_calculate_regenerative_success(calculation_service, base_payload, mock_modcod_entries):
    """
    Verify basic Regenerative Transponder calculation.
    Uplink and Downlink are independent.
    """
    payload = base_payload.copy()
    payload["transponder_type"] = "REGENERATIVE"
    
    # For regenerative, we need separate modcod tables (or same ID for both)
    mc_id = payload.pop("modcod_table_id")
    payload["uplink_modcod_table_id"] = mc_id
    payload["downlink_modcod_table_id"] = mc_id
    
    # Bandwidth must be per-link in regenerative (implied by service logic)
    # The service logic throws error if shared 'bandwidth_hz' is set in runtime root for Regenerative?
    # Let's check logic:
    # "if shared_bandwidth is not None: raise ... detail='Regenerative ... require per-link ...'"
    # So we remove root bandwidth
    del payload["runtime"]["bandwidth_hz"]
    
    result = await calculation_service.calculate(payload)
    
    assert result["strategy"]["transponder_type"] == "REGENERATIVE"
    assert result["combined_cn_db"] is None # Should not combine
    assert result["results"]["uplink"]["link_margin_db"] is not None
    assert result["results"]["downlink"]["link_margin_db"] is not None
    
    # Check independent selection
    assert result["modcod_selected"]["uplink"] is not None
    assert result["modcod_selected"]["downlink"] is not None


@pytest.mark.asyncio
async def test_interference_degradation(calculation_service, base_payload):
    """
    Verify that adding interference degrades the C/N (resulting in lower C/(N+I)).
    """
    # 1. Run Baseline
    res_base = await calculation_service.calculate(base_payload)
    cn_base = res_base["results"]["downlink"]["cn_db"]
    
    # 2. Add Interference to Downlink
    # C/I = 10 dB. This is a strong interference, should significantly degrade C/N.
    # 10 dB means I is 0.1 * C.
    # If base C/N was e.g. 20dB (N = 0.01 C), new Noise+Interference is 0.01C + 0.1C = 0.11C
    # New C/(N+I) approx 1/0.11 = 9 => ~9.5 dB.
    payload_int = copy.deepcopy(base_payload)
    
    payload_int["runtime"]["downlink"]["interference"] = {
        "adjacent_sat_ci_db": 10.0,
        "applied": True,
    }
    
    res_int = await calculation_service.calculate(payload_int)
    cni_int = res_int["results"]["downlink"]["cni_db"] # This is the degraded one
    cn_effective = res_int["results"]["downlink"]["cn_db"] # This also becomes the effective C/N
    
    assert cni_int < cn_base
    assert cn_effective < cn_base
    
    # Theoretical Check
    # (C/N_eff)^-1 = (C/N_thermal)^-1 + (C/I)^-1
    cn_lin_base = 10**(cn_base/10)
    ci_lin = 10**(10.0/10)
    expected_inv = (1/cn_lin_base) + (1/ci_lin)
    expected_cn_val = 10 * math.log10(1/expected_inv)
    
    assert math.isclose(cn_effective, expected_cn_val, abs_tol=0.1)


@pytest.mark.asyncio
async def test_intermodulation_degradation(calculation_service, base_payload):
    """
    Verify that adding Intermodulation degrades the C/N.
    """
    res_base = await calculation_service.calculate(base_payload)
    cn_base = res_base["results"]["downlink"]["cn_db"]
    
    payload_imd = copy.deepcopy(base_payload)
    payload_imd["runtime"]["intermodulation"] = {
        "output_backoff_db": 3.0,
        "composite_carriers": 2, # Multi-carrier
        "applied": True,
    }
    # Logic in service:
    # c_im_db = 2 * backoff + 7 - 10 * log10(carriers)
    # c_im_db = 2*3 + 7 - 10*0.3 = 6 + 7 - 3 = 10 dB roughly
    
    res_imd = await calculation_service.calculate(payload_imd)
    cn_imd = res_imd["results"]["downlink"]["cn_db"]
    c_im_reported = res_imd["results"]["downlink"]["c_im_db"]
    
    assert c_im_reported is not None
    assert cn_imd < cn_base
    
    # Check calc
    backoff = 3.0
    carriers = 2
    expected_cim = 2 * backoff + 7 - 10 * math.log10(carriers)
    assert math.isclose(c_im_reported, expected_cim, abs_tol=0.1)


@pytest.mark.asyncio
async def test_modcod_selection_logic(calculation_service, base_payload):
    """
    Verify that ModCod selection adapts to the Link Margin.
    We will artificially lower the Satellite EIRP to force a lower ModCod selection.
    """
    # High power scenario (should pick 8PSK 3/4 or highest available)
    res_high = await calculation_service.calculate(base_payload)
    modcod_high = res_high["modcod_selected"]["id"]
    
    # Low power scenario
    # Reduce Sat EIRP drastically (e.g., -20 dB)
    payload_low = copy.deepcopy(base_payload)
    # We can use overrides for this
    payload_low["overrides"] = {
        "satellite": {"eirp_dbw": 10.0}, # Reduced from 50.0
    }
    
    res_low = await calculation_service.calculate(payload_low)
    modcod_low = res_low["modcod_selected"]["id"]
    
    # 8PSK requires more SNR than QPSK.
    # So High power -> 8PSK (or best), Low power -> QPSK (or none)
    # Based on mock_modcod_entries: QPSK_1/4 (lowest), 8PSK_3/4 (highest)
    
    # We expect modcod_high to be higher order than modcod_low
    # Or strictly: they should likely be different if the drop is large enough.
    
    assert modcod_high != modcod_low
    assert "8PSK" in modcod_high
    assert "QPSK" in modcod_low

@pytest.mark.asyncio
async def test_validate_bandwidth_mismatch_transparent(calculation_service, base_payload):
    """
    Transparent mode requires Uplink and Downlink bandwidth to be the same (or derived from common).
    If they differ, it should raise 400.
    """
    payload = copy.deepcopy(base_payload)
    # Remove common bandwidth
    del payload["runtime"]["bandwidth_hz"]
    # Set differing bandwidths
    payload["runtime"]["uplink"]["bandwidth_hz"] = 10e6
    payload["runtime"]["downlink"]["bandwidth_hz"] = 5e6
    
    with pytest.raises(Exception) as exc:
        await calculation_service.calculate(payload)
    
    # Fastapi HTTPException is expected, but service might raise it directly
    # Check for status code 400
    assert exc.value.status_code == 400
    assert "bandwidth" in exc.value.detail.lower()
