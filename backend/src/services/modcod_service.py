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

    async def list(self, waveform: str | None = None):
        if waveform:
            return await self.repo.list_versions(waveform)
        return await self.repo.list()

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
