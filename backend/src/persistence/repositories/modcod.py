from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.modcod import ModcodTable
from src.persistence.repositories.base import BaseRepository


class ModcodRepository(BaseRepository[ModcodTable]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, ModcodTable)

    async def list_by_waveform(self, waveform: str) -> Sequence[ModcodTable]:
        stmt = select(ModcodTable).where(ModcodTable.waveform == waveform)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_paginated(
        self, limit: int = 20, offset: int = 0, waveform: str | None = None,
    ) -> tuple[Sequence[ModcodTable], int]:
        count_stmt = select(func.count()).select_from(ModcodTable)
        items_stmt = select(ModcodTable)

        if waveform:
            count_stmt = count_stmt.where(ModcodTable.waveform == waveform)
            items_stmt = items_stmt.where(ModcodTable.waveform == waveform)

        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        items_stmt = items_stmt.limit(limit).offset(offset)
        result = await self.session.execute(items_stmt)
        items = result.scalars().all()
        return items, total
