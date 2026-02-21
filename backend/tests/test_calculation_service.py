# ruff: noqa: E402
import sys
import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.services.calculation_service import CalculationService  # type: ignore  # noqa: E402


class FakeRepo:
    def __init__(self, obj=None):
        self.obj = obj

    async def get(self, _id):
        return self.obj


@pytest.mark.asyncio
async def test_calculate_404_when_modcod_missing():
    service = CalculationService(
        modcod_repo=FakeRepo(obj=None),
        satellite_repo=FakeRepo(obj=None),
        earth_station_repo=FakeRepo(obj=None),
    )
    payload = {
        "waveform_strategy": "DVB_S2X",
        "transponder_type": "TRANSPARENT",
        "modcod_table_id": uuid.uuid4(),
        "satellite_id": uuid.uuid4(),
        "earth_station_tx_id": uuid.uuid4(),
        "earth_station_rx_id": uuid.uuid4(),
        "runtime": {
            "sat_longitude_deg": 140.0,
            "uplink": {
                "frequency_hz": 14.25e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 35.0,
                "ground_lon_deg": 139.0,
                "ground_alt_m": 0.0,
            },
            "downlink": {
                "frequency_hz": 12e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 35.0,
                "ground_lon_deg": 139.0,
                "ground_alt_m": 0.0,
            },
        },
    }
    with pytest.raises(HTTPException) as exc:
        await service.calculate(payload)
    assert exc.value.status_code == 404
    assert "ModCod" in exc.value.detail
