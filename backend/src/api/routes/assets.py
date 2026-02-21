from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.assets import (
    EarthStationCreate,
    EarthStationRead,
    SatelliteCreate,
    SatelliteRead,
)
from src.api.schemas.pagination import PaginatedResponse
from src.config.deps import get_db_session
from src.services.assets_service import AssetsService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post(
    "/satellites",
    response_model=SatelliteRead,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_satellite",
)
async def create_satellite(
    body: SatelliteCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = AssetsService(session)
    sat = await service.create_satellite(body.model_dump())
    return sat


@router.get(
    "/satellites",
    response_model=PaginatedResponse[SatelliteRead],
    operation_id="list_satellites",
)
async def list_satellites(
    limit: int = Query(ge=1, le=100, default=20),  # noqa: B008
    offset: int = Query(ge=0, default=0),  # noqa: B008
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = AssetsService(session)
    items, total = await service.list_satellites_paginated(limit=limit, offset=offset)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.put(
    "/satellites/{sat_id}",
    response_model=SatelliteRead,
    operation_id="update_satellite",
)
async def update_satellite(
    sat_id: UUID,
    body: SatelliteCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = AssetsService(session)
    sat = await service.update_satellite(sat_id, body.model_dump(exclude_unset=True))
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found")
    return sat


@router.delete(
    "/satellites/{sat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_satellite",
)
async def delete_satellite(sat_id: UUID, session: AsyncSession = Depends(get_db_session)):  # noqa: B008
    service = AssetsService(session)
    try:
        deleted = await service.delete_satellite(sat_id)
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Satellite is referenced and cannot be deleted",
        ) from None
    if not deleted:
        raise HTTPException(status_code=404, detail="Satellite not found")


@router.post(
    "/earth-stations",
    response_model=EarthStationRead,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_earth_station",
)
async def create_earth_station(
    body: EarthStationCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = AssetsService(session)
    es = await service.create_earth_station(body.model_dump())
    return es


@router.get(
    "/earth-stations",
    response_model=PaginatedResponse[EarthStationRead],
    operation_id="list_earth_stations",
)
async def list_earth_stations(
    limit: int = Query(ge=1, le=100, default=20),  # noqa: B008
    offset: int = Query(ge=0, default=0),  # noqa: B008
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = AssetsService(session)
    items, total = await service.list_earth_stations_paginated(limit=limit, offset=offset)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.put(
    "/earth-stations/{es_id}",
    response_model=EarthStationRead,
    operation_id="update_earth_station",
)
async def update_earth_station(
    es_id: UUID,
    body: EarthStationCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = AssetsService(session)
    es = await service.update_earth_station(es_id, body.model_dump(exclude_unset=True))
    if not es:
        raise HTTPException(status_code=404, detail="Earth station not found")
    return es


@router.delete(
    "/earth-stations/{es_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_earth_station",
)
async def delete_earth_station(es_id: UUID, session: AsyncSession = Depends(get_db_session)):  # noqa: B008
    service = AssetsService(session)
    try:
        deleted = await service.delete_earth_station(es_id)
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Earth station is referenced and cannot be deleted",
        ) from None
    if not deleted:
        raise HTTPException(status_code=404, detail="Earth station not found")
