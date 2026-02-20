from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.limiter import limiter
from src.api.schemas.sweep import SweepRequest, SweepResponse
from src.config.deps import get_db_session
from src.persistence.repositories.assets import EarthStationRepository, SatelliteRepository
from src.persistence.repositories.modcod import ModcodRepository
from src.services.sweep_service import SweepService

router = APIRouter(prefix="/link-budgets", tags=["sweep"])


@router.post(
    "/sweep",
    response_model=SweepResponse,
    operation_id="sweep_link_budget",
)
@limiter.limit("10/minute")
async def sweep(
    request: Request,
    body: SweepRequest,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
):
    service = SweepService(
        modcod_repo=ModcodRepository(session),
        satellite_repo=SatelliteRepository(session),
        earth_station_repo=EarthStationRepository(session),
    )
    result = await service.execute(
        base_payload=body.base_request.model_dump(),
        sweep_config=body.sweep,
        threshold_db=body.threshold_db,
    )
    return result
