from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.scenario import Scenario
from src.persistence.repositories.base import BaseRepository


class ScenarioRepository(BaseRepository[Scenario]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Scenario)

    async def list_recent(self, limit: int = 50) -> Sequence[Scenario]:
        stmt = select(Scenario).order_by(Scenario.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_recent_paginated(
        self, limit: int = 20, offset: int = 0,
    ) -> tuple[Sequence[Scenario], int]:
        count_stmt = select(func.count()).select_from(Scenario)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        stmt = (
            select(Scenario)
            .order_by(Scenario.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        items = result.scalars().all()
        return items, total
