from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.modcod import ModcodTableCreate, ModcodTableRead
from src.api.schemas.pagination import PaginatedResponse
from src.config.deps import get_db_session
from src.services.modcod_service import ModcodService

router = APIRouter(prefix="/assets/modcod-tables", tags=["modcod"])


@router.post(
    "",
    response_model=ModcodTableRead,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_modcod",
)
async def create_modcod(
    body: ModcodTableCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ModcodService(session)
    try:
        table = await service.create(body.model_dump())
    except IntegrityError:
        # Unique constraint on (waveform, version) violated
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ModCod table with this waveform and version already exists",
        ) from None
    return table


@router.get("", response_model=PaginatedResponse[ModcodTableRead], operation_id="list_modcod")
async def list_modcod(
    waveform: str | None = None,
    limit: int = Query(ge=1, le=100, default=20),  # noqa: B008
    offset: int = Query(ge=0, default=0),  # noqa: B008
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ModcodService(session)
    items, total = await service.list_paginated(limit=limit, offset=offset, waveform=waveform)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/{table_id}/publish",
    response_model=ModcodTableRead,
    operation_id="publish_modcod",
)
async def publish_modcod(
    table_id: UUID,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ModcodService(session)
    table = await service.publish(table_id)
    if not table:
        raise HTTPException(status_code=404, detail="ModCod table not found")
    return table


@router.delete(
    "/{table_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_modcod",
)
async def delete_modcod(
    table_id: UUID,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ModcodService(session)
    try:
        deleted = await service.delete(table_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="ModCod table is referenced and cannot be deleted") from None
    if not deleted:
        raise HTTPException(status_code=404, detail="ModCod table not found")
