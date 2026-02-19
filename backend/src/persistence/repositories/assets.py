from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.assets import EarthStation, Satellite
from src.persistence.repositories.base import BaseRepository


class SatelliteRepository(BaseRepository[Satellite]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Satellite)

    async def list_all(self) -> Sequence[Satellite]:
        result = await self.session.execute(select(Satellite))
        return result.scalars().all()

    async def list_all_paginated(
        self, limit: int = 20, offset: int = 0
    ) -> tuple[Sequence[Satellite], int]:
        count_stmt = select(func.count()).select_from(Satellite)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        stmt = select(Satellite).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        items = result.scalars().all()
        return items, total


class EarthStationRepository(BaseRepository[EarthStation]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, EarthStation)

    async def list_all(self) -> Sequence[EarthStation]:
        result = await self.session.execute(select(EarthStation))
        return result.scalars().all()

    async def list_all_paginated(
        self, limit: int = 20, offset: int = 0
    ) -> tuple[Sequence[EarthStation], int]:
        count_stmt = select(func.count()).select_from(EarthStation)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        stmt = select(EarthStation).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        items = result.scalars().all()
        return items, total
