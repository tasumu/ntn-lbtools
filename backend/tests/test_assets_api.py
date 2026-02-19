# ruff: noqa: E402
"""API-level CRUD tests for satellite and earth station assets."""

import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from src.persistence.models.assets import EarthStation, Satellite

SATELLITE_PAYLOAD = {
    "name": "GEO-SAT-1",
    "description": "GEO Ku-band satellite",
    "orbit_type": "GEO",
    "longitude_deg": 128.0,
    "eirp_dbw": 52.0,
    "gt_db_per_k": 3.5,
    "frequency_band": "Ku",
}

EARTH_STATION_PAYLOAD = {
    "name": "Tokyo Hub",
    "description": "Primary uplink station",
    "antenna_diameter_m": 7.6,
    "eirp_dbw": 75.0,
    "gt_db_per_k": 30.5,
    "noise_temperature_k": 120.0,
}


class TestCreateSatellite:
    @pytest.mark.asyncio
    async def test_create_satellite_success(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/satellites", json=SATELLITE_PAYLOAD)

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "GEO-SAT-1"
        assert body["orbit_type"] == "GEO"
        assert body["longitude_deg"] == 128.0
        assert body["eirp_dbw"] == 52.0
        uuid.UUID(body["id"])

    @pytest.mark.asyncio
    async def test_create_satellite_missing_name_rejected(self, client_factory, fake_db):
        payload = {k: v for k, v in SATELLITE_PAYLOAD.items() if k != "name"}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/satellites", json=payload)

        assert resp.status_code == 422
        assert "name" in resp.text

    @pytest.mark.asyncio
    async def test_create_satellite_minimal(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/satellites", json={"name": "MinimalSat"})

        assert resp.status_code == 201
        assert resp.json()["orbit_type"] == "GEO"


class TestListSatellites:
    @pytest.mark.asyncio
    async def test_list_satellites_empty(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/satellites")

        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["limit"] == 20
        assert body["offset"] == 0

    @pytest.mark.asyncio
    async def test_list_satellites_returns_seeded(self, client_factory, fake_db):
        sat = Satellite(name="ListSat", orbit_type="GEO", longitude_deg=100.0)
        fake_db.seed(sat)

        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/satellites")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        items = body["items"]
        assert len(items) == 1
        assert items[0]["name"] == "ListSat"


class TestUpdateSatellite:
    @pytest.mark.asyncio
    async def test_update_satellite_success(self, client_factory, fake_db):
        sat = Satellite(name="OldName", orbit_type="GEO", longitude_deg=100.0)
        fake_db.seed(sat)
        sat_id = str(sat.id)

        updated = dict(SATELLITE_PAYLOAD, name="NewName")
        async with client_factory(fake_db) as client:
            resp = await client.put(f"/api/v1/assets/satellites/{sat_id}", json=updated)

        assert resp.status_code == 200
        assert resp.json()["name"] == "NewName"

    @pytest.mark.asyncio
    async def test_update_satellite_not_found(self, client_factory, fake_db):
        random_id = str(uuid.uuid4())
        async with client_factory(fake_db) as client:
            resp = await client.put(
                f"/api/v1/assets/satellites/{random_id}",
                json=SATELLITE_PAYLOAD,
            )

        assert resp.status_code == 404


class TestDeleteSatellite:
    @pytest.mark.asyncio
    async def test_delete_satellite_success(self, client_factory, fake_db):
        sat = Satellite(name="ToDelete", orbit_type="GEO")
        fake_db.seed(sat)

        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/assets/satellites/{sat.id}")

        assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_satellite_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/assets/satellites/{uuid.uuid4()}")

        assert resp.status_code == 404


class TestCreateEarthStation:
    @pytest.mark.asyncio
    async def test_create_earth_station_success(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=EARTH_STATION_PAYLOAD)

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Tokyo Hub"
        assert body["antenna_diameter_m"] == 7.6
        uuid.UUID(body["id"])

    @pytest.mark.asyncio
    async def test_create_earth_station_missing_name_rejected(self, client_factory, fake_db):
        payload = {k: v for k, v in EARTH_STATION_PAYLOAD.items() if k != "name"}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_earth_station_extra_field_rejected(self, client_factory, fake_db):
        payload = dict(EARTH_STATION_PAYLOAD, bogus_field="nope")
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=payload)

        assert resp.status_code == 422


class TestListEarthStations:
    @pytest.mark.asyncio
    async def test_list_earth_stations_empty(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/earth-stations")

        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["limit"] == 20
        assert body["offset"] == 0

    @pytest.mark.asyncio
    async def test_list_earth_stations_returns_seeded(self, client_factory, fake_db):
        es = EarthStation(name="Seeded ES", antenna_diameter_m=3.0)
        fake_db.seed(es)

        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/earth-stations")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        items = body["items"]
        assert len(items) == 1
        assert items[0]["name"] == "Seeded ES"


class TestUpdateEarthStation:
    @pytest.mark.asyncio
    async def test_update_earth_station_success(self, client_factory, fake_db):
        es = EarthStation(name="OldES", antenna_diameter_m=2.4)
        fake_db.seed(es)

        updated = dict(EARTH_STATION_PAYLOAD, name="UpdatedES")
        async with client_factory(fake_db) as client:
            resp = await client.put(f"/api/v1/assets/earth-stations/{es.id}", json=updated)

        assert resp.status_code == 200
        assert resp.json()["name"] == "UpdatedES"

    @pytest.mark.asyncio
    async def test_update_earth_station_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.put(
                f"/api/v1/assets/earth-stations/{uuid.uuid4()}",
                json=EARTH_STATION_PAYLOAD,
            )

        assert resp.status_code == 404


class TestEarthStationLocation:
    @pytest.mark.asyncio
    async def test_create_earth_station_with_location(self, client_factory, fake_db):
        payload = {
            **EARTH_STATION_PAYLOAD,
            "name": "Location ES",
            "latitude_deg": 35.68,
            "longitude_deg": 139.69,
            "altitude_m": 40.0,
        }
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["latitude_deg"] == 35.68
        assert body["longitude_deg"] == 139.69
        assert body["altitude_m"] == 40.0

    @pytest.mark.asyncio
    async def test_create_earth_station_without_location(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=EARTH_STATION_PAYLOAD)

        assert resp.status_code == 201
        body = resp.json()
        assert body["latitude_deg"] is None
        assert body["longitude_deg"] is None
        assert body["altitude_m"] is None

    @pytest.mark.asyncio
    async def test_latitude_out_of_range_rejected(self, client_factory, fake_db):
        payload = {**EARTH_STATION_PAYLOAD, "name": "Bad Lat", "latitude_deg": 91.0}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_longitude_out_of_range_rejected(self, client_factory, fake_db):
        payload = {**EARTH_STATION_PAYLOAD, "name": "Bad Lon", "longitude_deg": 181.0}
        async with client_factory(fake_db) as client:
            resp = await client.post("/api/v1/assets/earth-stations", json=payload)

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_location_fields_in_get(self, client_factory, fake_db):
        es = EarthStation(
            name="LocGet",
            latitude_deg=48.85,
            longitude_deg=2.35,
            altitude_m=35.0,
        )
        fake_db.seed(es)

        async with client_factory(fake_db) as client:
            resp = await client.get("/api/v1/assets/earth-stations")

        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["latitude_deg"] == 48.85
        assert items[0]["longitude_deg"] == 2.35
        assert items[0]["altitude_m"] == 35.0


class TestDeleteEarthStation:
    @pytest.mark.asyncio
    async def test_delete_earth_station_success(self, client_factory, fake_db):
        es = EarthStation(name="ToDeleteES")
        fake_db.seed(es)

        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/assets/earth-stations/{es.id}")

        assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_earth_station_not_found(self, client_factory, fake_db):
        async with client_factory(fake_db) as client:
            resp = await client.delete(f"/api/v1/assets/earth-stations/{uuid.uuid4()}")

        assert resp.status_code == 404
