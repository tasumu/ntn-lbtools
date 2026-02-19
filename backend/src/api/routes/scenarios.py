from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.pagination import PaginatedResponse
from src.api.schemas.scenario import ScenarioCreate, ScenarioRead
from src.config.deps import get_db_session
from src.services.scenario_service import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.post(
    "",
    response_model=ScenarioRead,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_scenario",
)
async def create_scenario(
    body: ScenarioCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ScenarioService(session)
    scenario = await service.save(body.model_dump())
    return scenario


@router.get("", response_model=PaginatedResponse[ScenarioRead], operation_id="list_scenarios")
async def list_scenarios(
    limit: int = Query(ge=1, le=100, default=20),  # noqa: B008
    offset: int = Query(ge=0, default=0),  # noqa: B008
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ScenarioService(session)
    items, total = await service.list_paginated(limit=limit, offset=offset)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/{scenario_id}",
    response_model=ScenarioRead,
    operation_id="get_scenario",
)
async def get_scenario(
    scenario_id: UUID,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ScenarioService(session)
    scenario = await service.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.put(
    "/{scenario_id}",
    response_model=ScenarioRead,
    operation_id="update_scenario",
)
async def update_scenario(
    scenario_id: UUID,
    body: ScenarioCreate,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = ScenarioService(session)
    scenario = await service.update(scenario_id, body.model_dump(exclude_unset=True))
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.delete(
    "/{scenario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_scenario",
)
async def delete_scenario(scenario_id: UUID, session: AsyncSession = Depends(get_db_session)):  # noqa: B008
    service = ScenarioService(session)
    try:
        deleted = await service.delete(scenario_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Scenario is referenced and cannot be deleted") from None
    if not deleted:
        raise HTTPException(status_code=404, detail="Scenario not found")
