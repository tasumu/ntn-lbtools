import asyncio
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import context
from src.config.settings import get_database_url
from src.persistence.database import Base, get_engine

config = context.config

if config.config_file_name is not None and Path(config.config_file_name).is_file():
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    cmd_opts = context.get_x_argument(as_dictionary=True)
    url_override = cmd_opts.get("db_url")
    return get_database_url(url_override)


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable: AsyncEngine = get_engine()

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
