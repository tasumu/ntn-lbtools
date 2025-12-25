from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.calculation import CalculationRequest, CalculationResponse
from src.config.deps import get_db_session
from src.persistence.repositories.modcod import ModcodRepository
from src.persistence.repositories.assets import EarthStationRepository, SatelliteRepository
from src.services.calculation_service import CalculationService

router = APIRouter(prefix="/link-budgets", tags=["calculations"])


@router.post(
    "/calculate",
    response_model=CalculationResponse,
    operation_id="calculate_link_budget",
)
async def calculate(body: CalculationRequest, session: AsyncSession = Depends(get_db_session)):  # noqa: B008
    service = CalculationService(
        modcod_repo=ModcodRepository(session),
        satellite_repo=SatelliteRepository(session),
        earth_station_repo=EarthStationRepository(session),
    )
    result = await service.calculate(body.model_dump())
    return result
