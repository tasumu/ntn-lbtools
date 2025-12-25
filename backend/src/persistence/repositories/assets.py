from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.assets import EarthStation, Satellite
from src.persistence.repositories.base import BaseRepository


class SatelliteRepository(BaseRepository[Satellite]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Satellite)

    async def list_all(self) -> Sequence[Satellite]:
        result = await self.session.execute(select(Satellite))
        return result.scalars().all()


class EarthStationRepository(BaseRepository[EarthStation]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, EarthStation)

    async def list_all(self) -> Sequence[EarthStation]:
        result = await self.session.execute(select(EarthStation))
        return result.scalars().all()
