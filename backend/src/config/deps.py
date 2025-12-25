from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import get_settings
from src.persistence.database import async_session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


__all__ = ["get_db_session", "get_settings"]
