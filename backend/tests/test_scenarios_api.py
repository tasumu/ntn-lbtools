# ruff: noqa: E402
"""API-level CRUD tests for scenarios."""

import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from src.persistence.models.scenario import Scenario

MODCOD_TABLE_ID = str(uuid.uuid4())
SATELLITE_ID = str(uuid.uuid4())


def _make_payload_snapshot() -> dict:
    return {
        "static": {
            "modcod_table_id": MODCOD_TABLE_ID,
            "modcod_entries": [
                {
                    "id": "QPSK_1_4",
                    "modulation": "QPSK",
                    "code_rate": "1/4",
                    "required_ebno_db": -2.35,
                    "info_bits_per_symbol": 0.49,
                },
            ],
        },
        "entity": {},
        "runtime": {
            "sat_longitude_deg": 140.0,
            "uplink": {
                "frequency_hz": 14.25e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 35.68,
                "ground_lon_deg": 139.69,
                "ground_alt_m": 40.0,
            },
            "downlink": {
                "frequency_hz": 12.0e9,
                "bandwidth_hz": 36e6,
                "elevation_deg": 35.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 35.68,
                "ground_lon_deg": 139.69,
                "ground_alt_m": 40.0,
            },
        },
        "strategy": {
            "waveform_strategy": "DVB_S2X",
            "transponder_type": "TRANSPARENT",
        },
        "metadata": {"schema_version": "1.1.0"},
    }


def _scenario_create_payload(name: str = "Test Scenario") -> dict:
    return {
        "name": name,
        "waveform_strategy": "DVB_S2X",
        "transponder_type": "TRANSPARENT",
        "modcod_table_id": MODCOD_TABLE_ID,
        "satellite_id": SATELLITE_ID,
        "payload_snapshot": _make_payload_snapshot(),
    }


def _seed_scenario(fake_db, name: str = "Seeded Scenario") -> Scenario:
    scenario = Scenario(
        name=name,
        waveform_strategy="DVB_S2X",
        transponder_type="TRANSPARENT",
        modcod_table_id=uuid.UUID(MODCOD_TABLE_ID),
        satellite_id=uuid.UUID(SATELLITE_ID),
        schema_version="1.1.0",
        status="Draft",
        payload_snapshot=_make_payload_snapshot(),
    )
    fake_db.seed(scenario)
    return scenario


class TestCreateScenario:
    @pytest.mark.asyncio
    async def test_create_scenario_success(self, client_factory, fake_db):
        payload = _scenario_create_payload()
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/scenarios", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Test Scenario"
        assert body["waveform_strategy"] == "DVB_S2X"
        uuid.UUID(body["id"])

    @pytest.mark.asyncio
    async def test_create_scenario_missing_name_rejected(self, client_factory, fake_db):
        payload = _scenario_create_payload()
        del payload["name"]
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/scenarios", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_scenario_invalid_waveform_rejected(self, client_factory, fake_db):
        payload = _scenario_create_payload()
        payload["waveform_strategy"] = "INVALID_WAVEFORM"
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/scenarios", json=payload)

        assert resp.status_code == 422


class TestListScenarios:
    @pytest.mark.asyncio
    async def test_list_scenarios_empty(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/scenarios")

        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["limit"] == 20
        assert body["offset"] == 0

    @pytest.mark.asyncio
    async def test_list_scenarios_returns_seeded(self, client_factory, fake_db):
        _seed_scenario(fake_db, name="Listed Scenario")

        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/scenarios")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        items = body["items"]
        assert len(items) == 1
        assert items[0]["name"] == "Listed Scenario"


class TestGetScenario:
    @pytest.mark.asyncio
    async def test_get_scenario_success(self, client_factory, fake_db):
        scenario = _seed_scenario(fake_db)

        async with client_factory(fake_db) as client:
            resp = await client.get(f"/api/v1/scenarios/{scenario.id}")

        assert resp.status_code == 200
        assert resp.json()["name"] == "Seeded Scenario"

    @pytest.mark.asyncio
    async def test_get_scenario_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.get(f"/api/v1/scenarios/{uuid.uuid4()}")

        assert resp.status_code == 404


class TestUpdateScenario:
    @pytest.mark.asyncio
    async def test_update_scenario_success(self, client_factory, fake_db):
        scenario = _seed_scenario(fake_db)

        updated = _scenario_create_payload(name="Updated Name")
        async with client_factory(fake_db) as client:
            resp = await client.put(f"/api/v1/scenarios/{scenario.id}", json=updated)

        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_scenario_not_found(self, client_factory, fake_db):
        payload = _scenario_create_payload()
        async with client_factory(fake_db) as client:
            resp = await client.put(f"/api/v1/scenarios/{uuid.uuid4()}", json=payload)

        assert resp.status_code == 404


class TestDeleteScenario:
    @pytest.mark.asyncio
    async def test_delete_scenario_success(self, client_factory, fake_db):
        scenario = _seed_scenario(fake_db)

        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/scenarios/{scenario.id}")

        assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_scenario_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/scenarios/{uuid.uuid4()}")

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_scenario_invalid_uuid(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.delete("/api/v1/scenarios/not-a-uuid")

        assert resp.status_code == 422
