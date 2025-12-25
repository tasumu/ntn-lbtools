from __future__ import annotations

import json
from typing import Any, Dict

import httpx
import pytest

from src.tools import (
    CALCULATE_ENDPOINT,
    CREATE_ENDPOINT,
    SEARCH_ENDPOINT,
    AssetReference,
    AssetType,
    CalculationInput,
    CreateAssetRequest,
    GeoPoint,
    SearchRequest,
    Settings,
    calculate_link_budget_impl,
    create_asset_impl,
    search_assets_impl,
)


def make_calculation_input() -> CalculationInput:
    return CalculationInput(
        tx_asset_id="tx-asset-123",
        rx_asset_id="rx-asset-456",
        sat_asset_id="sat-asset-789",
        tx_location=GeoPoint(lat=35.0, lon=139.0),
        rx_location=GeoPoint(lat=34.7, lon=135.5),
    )


def make_calculation_response(link_margin_db: float = 7.25) -> Dict[str, Any]:
    return {
        "link_margin_db": link_margin_db,
        "key_parameters": {"cn0_dbhz": 55.0, "ebno_db": 12.0},
        "inputs_echo": make_calculation_input().model_dump(),
        "asset_provenance": [
            AssetReference(
                asset_id="sat-asset-789",
                asset_type=AssetType.SATELLITE,
                band="ku",
                orbit_or_coverage="GEO",
            ).model_dump(),
        ],
        "notes": "Backend calculation succeeded",
    }


def make_search_filters() -> SearchRequest:
    return SearchRequest(
        asset_type=AssetType.SATELLITE,
        band="ku",
        coverage_region="Japan",
        aperture_m=1.2,
    )


def make_search_response_payload() -> Dict[str, Any]:
    return {
        "items": [
            AssetReference(
                asset_id="sat-123",
                asset_type=AssetType.SATELLITE,
                band="ku",
                orbit_or_coverage="GEO",
                aperture_m=1.5,
                metadata={"provider": "ExampleSat"},
            ).model_dump(),
            AssetReference(
                asset_id="sat-456",
                asset_type=AssetType.SATELLITE,
                band="ku",
                orbit_or_coverage="MEO",
            ).model_dump(),
        ],
        "count": 2,
    }


def make_create_asset_payload() -> CreateAssetRequest:
    return CreateAssetRequest(
        asset_type=AssetType.EARTH_STATION,
        name="Temp Osaka 1.2m",
        band="ku",
        aperture_m=1.2,
        coverage_region="Osaka",
        notes="Temporary asset for quick calc",
        temporary=True,
    )


def make_create_response_payload() -> Dict[str, Any]:
    return AssetReference(
        asset_id="es-999",
        asset_type=AssetType.EARTH_STATION,
        band="ku",
        orbit_or_coverage="Osaka",
        aperture_m=1.2,
        metadata={"temporary": True},
    ).model_dump()


def make_mock_client(transport: httpx.BaseTransport) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=transport, base_url="http://backend.test")


@pytest.mark.asyncio
async def test_calculate_link_budget_success():
    payload = make_calculation_input()
    backend_payload = make_calculation_response(link_margin_db=8.5)

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == CALCULATE_ENDPOINT
        body = json.loads(request.content)
        assert body["tx_asset_id"] == payload.tx_asset_id
        assert body["rx_asset_id"] == payload.rx_asset_id
        return httpx.Response(200, json=backend_payload)

    transport = httpx.MockTransport(handler)
    settings = Settings(backend_api_url="http://backend.test")
    result = None
    async with make_mock_client(transport) as client:
        result = await calculate_link_budget_impl(payload, client=client, settings=settings)
    assert result is not None

    assert result["summary"].startswith("Link margin: 8.50")
    assert result["result"]["link_margin_db"] == pytest.approx(8.5)
    assert result["provenance"]["asset_ids"]["tx_asset_id"] == payload.tx_asset_id
    assert result["provenance"]["backend_url"] == "http://backend.test"


@pytest.mark.asyncio
async def test_calculate_link_budget_backend_error():
    payload = make_calculation_input()
    error_body = {"detail": "validation failed"}

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json=error_body)

    transport = httpx.MockTransport(handler)
    settings = Settings(backend_api_url="http://backend.test")
    result = None
    async with make_mock_client(transport) as client:
        result = await calculate_link_budget_impl(payload, client=client, settings=settings)
    assert result is not None

    assert result["status_code"] == 422
    assert "validation failed" in result["message"]
    assert result["details"]["body"] == error_body


@pytest.mark.asyncio
async def test_search_assets_success():
    filters = make_search_filters()
    backend_payload = make_search_response_payload()

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == SEARCH_ENDPOINT
        body = json.loads(request.content)
        assert body["asset_type"] == filters.asset_type.value
        return httpx.Response(200, json=backend_payload)

    transport = httpx.MockTransport(handler)
    settings = Settings(backend_api_url="http://backend.test")
    result = None
    async with make_mock_client(transport) as client:
        result = await search_assets_impl(filters, client=client, settings=settings)
    assert result is not None

    assert result["count"] == 2
    assert len(result["items"]) == 2
    assert "Found 2 asset(s)" in result["summary"]
    assert result["provenance"]["backend_url"] == "http://backend.test"


@pytest.mark.asyncio
async def test_search_assets_empty_results():
    filters = make_search_filters()
    backend_payload = {"items": [], "count": 0}

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=backend_payload)

    transport = httpx.MockTransport(handler)
    settings = Settings(backend_api_url="http://backend.test")
    result = None
    async with make_mock_client(transport) as client:
        result = await search_assets_impl(filters, client=client, settings=settings)
    assert result is not None

    assert result["count"] == 0
    assert result["items"] == []
    assert result["summary"] == "No assets found for supplied filters."


@pytest.mark.asyncio
async def test_create_asset_success():
    payload = make_create_asset_payload()
    backend_payload = make_create_response_payload()

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == CREATE_ENDPOINT
        body = json.loads(request.content)
        assert body["name"] == payload.name
        assert body["temporary"] is True
        return httpx.Response(201, json=backend_payload)

    transport = httpx.MockTransport(handler)
    settings = Settings(backend_api_url="http://backend.test")
    result = None
    async with make_mock_client(transport) as client:
        result = await create_asset_impl(payload, client=client, settings=settings)
    assert result is not None

    assert result["asset"]["asset_id"] == backend_payload["asset_id"]
    assert "temporary=True" in result["summary"]
    assert result["provenance"]["backend_url"] == "http://backend.test"


@pytest.mark.asyncio
async def test_create_asset_backend_error():
    payload = make_create_asset_payload()
    error_body = {"detail": "invalid aperture"}

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json=error_body)

    transport = httpx.MockTransport(handler)
    settings = Settings(backend_api_url="http://backend.test")
    result = None
    async with make_mock_client(transport) as client:
        result = await create_asset_impl(payload, client=client, settings=settings)
    assert result is not None

    assert result["status_code"] == 400
    assert "invalid aperture" in result["message"]
    assert result["details"]["body"] == error_body
