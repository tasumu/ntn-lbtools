# ruff: noqa: E402
"""API-level CRUD tests for ModCod tables."""

import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from src.persistence.models.modcod import ModcodTable

MODCOD_ENTRY_VALID = {
    "id": "QPSK_1_4",
    "modulation": "QPSK",
    "code_rate": "1/4",
    "required_ebno_db": -2.35,
    "info_bits_per_symbol": 0.49,
}

MODCOD_ENTRY_NO_THRESHOLD = {
    "id": "BAD_ENTRY",
    "modulation": "QPSK",
    "code_rate": "1/2",
    "info_bits_per_symbol": 1.0,
}

MODCOD_TABLE_PAYLOAD = {
    "name": "Standard DVB-S2X",
    "waveform": "DVB_S2X",
    "description": "Standard DVB-S2X table",
    "entries": [
        MODCOD_ENTRY_VALID,
        {
            "id": "8PSK_3_5",
            "modulation": "8PSK",
            "code_rate": "3/5",
            "required_ebno_db": 5.5,
            "info_bits_per_symbol": 1.78,
        },
    ],
}


def _make_modcod_entries_json():
    return [
        {
            "id": "QPSK_1_4",
            "modulation": "QPSK",
            "code_rate": "1/4",
            "required_ebno_db": -2.35,
            "required_cn0_dbhz": None,
            "info_bits_per_symbol": 0.49,
            "rolloff": None,
            "pilots": None,
        },
    ]


class TestCreateModcod:
    @pytest.mark.asyncio
    async def test_create_modcod_success(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=MODCOD_TABLE_PAYLOAD)

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Standard DVB-S2X"
        assert body["waveform"] == "DVB_S2X"
        assert body["version"] is None
        assert len(body["entries"]) == 2
        uuid.UUID(body["id"])

    @pytest.mark.asyncio
    async def test_create_modcod_with_version_succeeds(self, client_factory, fake_db):
        payload = {**MODCOD_TABLE_PAYLOAD, "name": "Versioned Table", "version": "2.0"}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Versioned Table"
        assert body["version"] == "2.0"

    @pytest.mark.asyncio
    async def test_create_modcod_missing_name_rejected(self, client_factory, fake_db):
        payload = {
            "waveform": "DVB_S2X",
            "entries": [MODCOD_ENTRY_VALID],
        }
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_modcod_empty_name_rejected(self, client_factory, fake_db):
        payload = {
            "name": "   ",
            "waveform": "DVB_S2X",
            "entries": [MODCOD_ENTRY_VALID],
        }
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_modcod_duplicate_waveform_name_rejected(self, client_factory, fake_db):
        table = ModcodTable(
            name="Duplicate Test",
            waveform="DVB_S2X",
            entries=_make_modcod_entries_json(),
        )
        fake_db.seed(table)

        payload = {
            "name": "Duplicate Test",
            "waveform": "DVB_S2X",
            "entries": [MODCOD_ENTRY_VALID],
        }
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_create_modcod_entry_missing_threshold_rejected(self, client_factory, fake_db):
        payload = {
            "name": "Bad Entries",
            "waveform": "DVB_S2X",
            "entries": [MODCOD_ENTRY_NO_THRESHOLD],
        }
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_modcod_missing_waveform_rejected(self, client_factory, fake_db):
        payload = {"name": "No waveform", "entries": [MODCOD_ENTRY_VALID]}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_modcod_invalid_info_bits_rejected(self, client_factory, fake_db):
        bad_entry = dict(MODCOD_ENTRY_VALID, info_bits_per_symbol=0)
        payload = {"name": "Bad info bits", "waveform": "DVB_S2X", "entries": [bad_entry]}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/modcod-tables", json=payload)

        assert resp.status_code == 422


class TestListModcod:
    @pytest.mark.asyncio
    async def test_list_modcod_empty(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/modcod-tables")

        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["limit"] == 20
        assert body["offset"] == 0

    @pytest.mark.asyncio
    async def test_list_modcod_returns_seeded(self, client_factory, fake_db):
        table = ModcodTable(
            name="Test Table",
            waveform="DVB_S2X",
            entries=_make_modcod_entries_json(),
        )
        fake_db.seed(table)

        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/modcod-tables")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        items = body["items"]
        assert len(items) == 1
        assert items[0]["name"] == "Test Table"
        assert items[0]["waveform"] == "DVB_S2X"

    @pytest.mark.asyncio
    async def test_list_modcod_filter_by_waveform(self, client_factory, fake_db):
        t1 = ModcodTable(
            name="Table A",
            waveform="DVB_S2X",
            entries=_make_modcod_entries_json(),
        )
        t2 = ModcodTable(
            name="Table B",
            waveform="DVB_RCS2",
            entries=_make_modcod_entries_json(),
        )
        fake_db.seed(t1)
        fake_db.seed(t2)

        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/modcod-tables?waveform=DVB_S2X")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        items = body["items"]
        assert len(items) == 1
        assert items[0]["waveform"] == "DVB_S2X"


class TestPublishModcod:
    @pytest.mark.asyncio
    async def test_publish_modcod_success(self, client_factory, fake_db):
        table = ModcodTable(
            name="Publish Test",
            waveform="DVB_S2X",
            entries=_make_modcod_entries_json(),
        )
        fake_db.seed(table)

        async with client_factory(fake_db) as client:
            resp = await client.post(f"/api/v1/assets/modcod-tables/{table.id}/publish")

        assert resp.status_code == 200
        body = resp.json()
        assert body["published_at"] is not None

    @pytest.mark.asyncio
    async def test_publish_modcod_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.post(f"/api/v1/assets/modcod-tables/{uuid.uuid4()}/publish")

        assert resp.status_code == 404


class TestDeleteModcod:
    @pytest.mark.asyncio
    async def test_delete_modcod_success(self, client_factory, fake_db):
        table = ModcodTable(
            name="Delete Test",
            waveform="DVB_S2X",
            entries=_make_modcod_entries_json(),
        )
        fake_db.seed(table)

        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/assets/modcod-tables/{table.id}")

        assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_modcod_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/assets/modcod-tables/{uuid.uuid4()}")

        assert resp.status_code == 404
