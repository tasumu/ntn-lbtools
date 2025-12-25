from collections.abc import AsyncGenerator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config.settings import get_database_url

metadata = MetaData()


class Base(DeclarativeBase):
    metadata = metadata


def get_engine(database_url: str | None = None):
    url = get_database_url(database_url)
    return create_async_engine(url, future=True, echo=False)


engine = get_engine()
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
