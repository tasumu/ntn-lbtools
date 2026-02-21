# ruff: noqa: E402, E501
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.persistence.models.assets import EarthStation, Satellite
from src.persistence.models.modcod import ModcodTable


def _seed_assets(fake_db):
    """Seed satellite, earth stations, and ModCod table for sweep tests."""
    sat_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    es_tx_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
    es_rx_id = uuid.UUID("00000000-0000-0000-0000-000000000003")
    mc_id = uuid.UUID("00000000-0000-0000-0000-000000000004")

    sat = Satellite(
        id=sat_id,
        name="Test Satellite",
        orbit_type="GEO",
        longitude_deg=128.0,
        eirp_dbw=51.0,
        gt_db_per_k=2.5,
        frequency_band="Ku",
    )
    tx = EarthStation(
        id=es_tx_id,
        name="TX Station",
        eirp_dbw=65.0,
        antenna_gain_tx_db=45.0,
        tx_power_dbw=20.0,
        gt_db_per_k=23.2,
        noise_temperature_k=120.0,
        antenna_gain_rx_db=44.0,
    )
    rx = EarthStation(
        id=es_rx_id,
        name="RX Station",
        eirp_dbw=65.0,
        antenna_gain_rx_db=44.0,
        gt_db_per_k=23.2,
        noise_temperature_k=120.0,
        antenna_gain_tx_db=45.0,
        tx_power_dbw=20.0,
    )
    mc = ModcodTable(
        id=mc_id,
        waveform="DVB_S2X",
        version="1.0.0",
        entries=[
            {
                "id": "qpsk-1/4",
                "modulation": "QPSK",
                "code_rate": "1/4",
                "required_cn0_dbhz": 60.0,
                "info_bits_per_symbol": 0.5,
            },
            {
                "id": "qpsk-1/2",
                "modulation": "QPSK",
                "code_rate": "1/2",
                "required_cn0_dbhz": 65.0,
                "info_bits_per_symbol": 1.0,
            },
            {
                "id": "8psk-3/4",
                "modulation": "8PSK",
                "code_rate": "3/4",
                "required_cn0_dbhz": 75.0,
                "info_bits_per_symbol": 2.25,
            },
        ],
    )
    fake_db.seed(sat)
    fake_db.seed(tx)
    fake_db.seed(rx)
    fake_db.seed(mc)
    return sat_id, es_tx_id, es_rx_id, mc_id


def _make_sweep_body(sat_id, es_tx_id, es_rx_id, mc_id, **sweep_overrides):
    sweep = {
        "parameter_path": "runtime.uplink.rain_rate_mm_per_hr",
        "start": 0,
        "end": 20,
        "steps": 3,
        **sweep_overrides,
    }
    return {
        "base_request": {
            "waveform_strategy": "DVB_S2X",
            "transponder_type": "TRANSPARENT",
            "modcod_table_id": str(mc_id),
            "satellite_id": str(sat_id),
            "earth_station_tx_id": str(es_tx_id),
            "earth_station_rx_id": str(es_rx_id),
            "runtime": {
                "sat_longitude_deg": 128.0,
                "bandwidth_hz": 36e6,
                "uplink": {
                    "frequency_hz": 14.25e9,
                    "bandwidth_hz": 36e6,
                    "rain_rate_mm_per_hr": 10.0,
                    "temperature_k": 290.0,
                    "ground_lat_deg": 35.0,
                    "ground_lon_deg": 139.0,
                    "ground_alt_m": 0.0,
                },
                "downlink": {
                    "frequency_hz": 12e9,
                    "bandwidth_hz": 36e6,
                    "rain_rate_mm_per_hr": 10.0,
                    "temperature_k": 120.0,
                    "ground_lat_deg": 35.0,
                    "ground_lon_deg": 139.0,
                    "ground_alt_m": 0.0,
                },
            },
        },
        "sweep": sweep,
        "threshold_db": 3.0,
    }


class TestSweepEndpoint:
    @pytest.mark.asyncio
    async def test_sweep_success(self, client_factory, fake_db):
        sat_id, es_tx_id, es_rx_id, mc_id = _seed_assets(fake_db)
        body = _make_sweep_body(sat_id, es_tx_id, es_rx_id, mc_id)

        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/link-budgets/sweep", json=body)

        assert resp.status_code == 200
        data = resp.json()
        assert data["sweep_parameter"] == "runtime.uplink.rain_rate_mm_per_hr"
        assert data["sweep_label"] == "Uplink Rain Rate (mm/hr)"
        assert len(data["points"]) == 3
        assert data["threshold_db"] == 3.0
        assert "strategy" in data

    @pytest.mark.asyncio
    async def test_sweep_response_points_have_required_fields(self, client_factory, fake_db):
        sat_id, es_tx_id, es_rx_id, mc_id = _seed_assets(fake_db)
        body = _make_sweep_body(sat_id, es_tx_id, es_rx_id, mc_id)

        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/link-budgets/sweep", json=body)

        data = resp.json()
        point = data["points"][0]
        required_fields = [
            "sweep_value",
            "combined_link_margin_db",
            "combined_cn_db",
            "uplink_cn_db",
            "downlink_cn_db",
            "viable",
            "warnings",
        ]
        for field in required_fields:
            assert field in point, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_sweep_invalid_parameter_path(self, client_factory, fake_db):
        sat_id, es_tx_id, es_rx_id, mc_id = _seed_assets(fake_db)
        body = _make_sweep_body(
            sat_id,
            es_tx_id,
            es_rx_id,
            mc_id,
            parameter_path="runtime.uplink.nonexistent",
        )

        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/link-budgets/sweep", json=body)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_sweep_steps_too_high(self, client_factory, fake_db):
        sat_id, es_tx_id, es_rx_id, mc_id = _seed_assets(fake_db)
        body = _make_sweep_body(
            sat_id,
            es_tx_id,
            es_rx_id,
            mc_id,
            steps=201,
        )

        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/link-budgets/sweep", json=body)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_sweep_values_monotonically_increase(self, client_factory, fake_db):
        sat_id, es_tx_id, es_rx_id, mc_id = _seed_assets(fake_db)
        body = _make_sweep_body(
            sat_id,
            es_tx_id,
            es_rx_id,
            mc_id,
            start=0,
            end=100,
            steps=5,
        )

        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/link-budgets/sweep", json=body)

        data = resp.json()
        values = [p["sweep_value"] for p in data["points"]]
        assert values == sorted(values)
        assert len(values) == 5

    @pytest.mark.asyncio
    async def test_sweep_rain_rate_margin_decreases(self, client_factory, fake_db):
        """As rain rate increases, link margin should decrease."""
        sat_id, es_tx_id, es_rx_id, mc_id = _seed_assets(fake_db)
        body = _make_sweep_body(
            sat_id,
            es_tx_id,
            es_rx_id,
            mc_id,
            start=0,
            end=50,
            steps=3,
        )

        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/link-budgets/sweep", json=body)

        data = resp.json()
        margins = [
            p["combined_link_margin_db"]
            for p in data["points"]
            if p["combined_link_margin_db"] is not None
        ]
        # Margins should be non-increasing as rain rate goes up
        assert len(margins) >= 2
        assert margins[0] >= margins[-1]
