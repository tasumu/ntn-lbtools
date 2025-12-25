from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.modcod import ModcodTable
from src.persistence.repositories.base import BaseRepository


class ModcodRepository(BaseRepository[ModcodTable]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, ModcodTable)

    async def list_versions(self, waveform: str) -> Sequence[ModcodTable]:
        stmt = select(ModcodTable).where(ModcodTable.waveform == waveform)
        result = await self.session.execute(stmt)
        return result.scalars().all()
