from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from src.persistence.models.modcod import ModcodTable
from src.persistence.repositories.modcod import ModcodRepository


class ModcodService:
    def __init__(self, session: AsyncSession):
        self.repo = ModcodRepository(session)

    async def create(self, data: dict) -> ModcodTable:
        table = ModcodTable(**data)
        await self.repo.add(table)
        await self.repo.session.commit()
        return table

    async def publish(self, table_id: UUID) -> ModcodTable | None:
        table = await self.repo.get(table_id)
        if not table:
            return None
        table.published_at = datetime.now(timezone.utc)
        await self.repo.session.commit()
        await self.repo.session.refresh(table)
        return table

    async def list(self, waveform: str | None = None) -> list[ModcodTable]:
        if waveform:
            return await self.repo.list_versions(waveform)
        return await self.repo.list()

    async def list_paginated(
        self, limit: int = 20, offset: int = 0, waveform: str | None = None
    ) -> tuple[list[ModcodTable], int]:
        items, total = await self.repo.list_paginated(
            limit=limit, offset=offset, waveform=waveform
        )
        return list(items), total

    async def delete(self, table_id: UUID) -> bool:
        table = await self.repo.get(table_id)
        if not table:
            return False
        await self.repo.session.delete(table)
        try:
            await self.repo.session.commit()
        except IntegrityError:
            await self.repo.session.rollback()
            raise
        return True
