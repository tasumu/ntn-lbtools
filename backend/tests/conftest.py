# ruff: noqa: E402
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

# Ensure src is importable when running under uv/pytest
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.api.main import app
from src.config.deps import get_db_session


class FakeResult:
    """Mimics SQLAlchemy Result.scalars().all()."""

    def __init__(self, items: list):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return list(self._items)


class FakeSession:
    """In-memory session that stores ORM objects by model class + id."""

    def __init__(self):
        self._store: dict[type, dict[Any, Any]] = {}

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    # ---- Session interface ----

    def add(self, obj: Any) -> None:
        if not hasattr(obj, "id") or obj.id is None:
            obj.id = uuid.uuid4()
        if not hasattr(obj, "created_at") or obj.created_at is None:
            obj.created_at = datetime.now(UTC)
        if hasattr(obj, "updated_at") and obj.updated_at is None:
            obj.updated_at = datetime.now(UTC)
        model_cls = type(obj)
        self._store.setdefault(model_cls, {})[obj.id] = obj

    async def get(self, model_cls: type, obj_id: Any) -> Any | None:
        return self._store.get(model_cls, {}).get(obj_id)

    async def flush(self) -> None:
        pass

    async def commit(self) -> None:
        pass

    async def rollback(self) -> None:
        pass

    async def refresh(self, obj: Any) -> None:
        if hasattr(obj, "updated_at"):
            obj.updated_at = datetime.now(UTC)

    async def delete(self, obj: Any) -> None:
        model_cls = type(obj)
        self._store.get(model_cls, {}).pop(getattr(obj, "id", None), None)

    async def execute(self, stmt: Any, *args: Any, **kwargs: Any) -> "FakeResult":
        model_cls = self._model_from_stmt(stmt)
        if model_cls is None:
            return FakeResult([])

        items = list(self._store.get(model_cls, {}).values())
        items = self._apply_where(stmt, items)
        return FakeResult(items)

    # ---- Helpers ----

    def _model_from_stmt(self, stmt: Any) -> type | None:
        try:
            for desc in stmt.column_descriptions:
                entity = desc.get("entity")
                if entity is not None:
                    return entity
        except Exception:
            pass
        return None

    def _apply_where(self, stmt: Any, items: list[Any]) -> list[Any]:
        try:
            clause = stmt.whereclause
            if clause is None:
                return items
            left = getattr(clause, "left", None)
            right = getattr(clause, "right", None)
            if left is None or right is None:
                return items
            col_name = getattr(left, "key", None)
            target_value = getattr(right, "value", None)
            if col_name and target_value is not None:
                return [i for i in items if getattr(i, col_name, None) == target_value]
        except Exception:
            pass
        return items

    # ---- Convenience for pre-populating ----

    def seed(self, obj: Any) -> Any:
        self.add(obj)
        return obj


async def fake_session_dep():
    async with FakeSession() as session:
        yield session


def override_session(session: FakeSession):
    async def _dep():
        yield session

    return _dep


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.fixture
def fake_db() -> FakeSession:
    return FakeSession()


@pytest.fixture
def client_factory(transport):
    def _make(session: FakeSession | None = None):
        if session is not None:
            app.dependency_overrides[get_db_session] = override_session(session)
        else:
            app.dependency_overrides[get_db_session] = fake_session_dep
        return AsyncClient(transport=transport, base_url="http://test")

    return _make
