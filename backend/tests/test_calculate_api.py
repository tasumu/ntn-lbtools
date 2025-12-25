# ruff: noqa: E402
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
from httpx import ASGITransport, AsyncClient

from src.api.main import app
from src.config.deps import get_db_session


class FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, *_args, **_kwargs):
        return None


async def _fake_session_dep():
    async with FakeSession() as session:
        yield session


@pytest.mark.asyncio
async def test_calculate_minimal_payload():
    app.dependency_overrides[get_db_session] = _fake_session_dep
    payload = {
        "waveform_strategy": "DVB_S2X",
        "transponder_type": "TRANSPARENT",
        "modcod_table_id": str(uuid.uuid4()),
        "satellite_id": str(uuid.uuid4()),
        "earth_station_tx_id": str(uuid.uuid4()),
        "earth_station_rx_id": str(uuid.uuid4()),
        "runtime": {
            "sat_longitude_deg": 140.0,
            "uplink": {
                "frequency_hz": 14.25e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 0.0,
                "ground_lon_deg": 0.0,
                "ground_alt_m": 0.0,
                "interference": {
                    "adjacent_sat_ci_db": None,
                    "cross_polar_ci_db": None,
                    "other_carrier_ci_db": None,
                    "applied": False,
                },
            },
            "downlink": {
                "frequency_hz": 12e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 0.0,
                "ground_lon_deg": 0.0,
                "ground_alt_m": 0.0,
                "interference": {
                    "adjacent_sat_ci_db": None,
                    "cross_polar_ci_db": None,
                    "other_carrier_ci_db": None,
                    "applied": False,
                },
            },
            "intermodulation": {
                "input_backoff_db": 3.0,
                "output_backoff_db": 3.0,
                "composite_carriers": 2,
                "reference_bandwidth_hz": 36e6,
                "applied": True,
            },
        },
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/link-budgets/calculate", json=payload)
    assert resp.status_code in (404, 422)
    if resp.status_code == 422:
        assert "modcod_table_id" in resp.text


@pytest.mark.asyncio
async def test_calculate_invalid_uuid_rejected():
    app.dependency_overrides[get_db_session] = _fake_session_dep
    payload = {
        "waveform_strategy": "DVB_S2X",
        "transponder_type": "TRANSPARENT",
        "modcod_table_id": "not-a-uuid",
        "satellite_id": "not-a-uuid",
        "earth_station_tx_id": "not-a-uuid",
        "earth_station_rx_id": "not-a-uuid",
        "runtime": {
            "sat_longitude_deg": 140.0,
            "uplink": {
                "frequency_hz": 14.25e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 0.0,
                "ground_lon_deg": 0.0,
                "ground_alt_m": 0.0,
            },
            "downlink": {
                "frequency_hz": 12e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 0.0,
                "ground_lon_deg": 0.0,
                "ground_alt_m": 0.0,
            },
        },
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/link-budgets/calculate", json=payload)
    assert resp.status_code == 422
    body = resp.json()
    assert "modcod_table_id" in str(body)
