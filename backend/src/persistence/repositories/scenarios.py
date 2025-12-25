from collections.abc import Sequence

from sqlalchemy import select
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
