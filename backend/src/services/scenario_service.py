from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.scenario import Scenario
from src.persistence.repositories.scenarios import ScenarioRepository
from src.core.strategies.dvbs2x import _clean_modcod_dict


class ScenarioService:
    def __init__(self, session: AsyncSession):
        self.repo = ScenarioRepository(session)

    def _backfill_payload(self, payload_snapshot: dict[str, Any]) -> dict[str, Any]:
        static = payload_snapshot.get("static") or {}
        # Strip legacy ModCod fields (e.g., spectral_efficiency) and keep only the supported keys.
        for key in ("modcod_entries", "uplink_modcod_entries", "downlink_modcod_entries"):
            entries = static.get(key)
            if isinstance(entries, list):
                static[key] = [_clean_modcod_dict(entry) if isinstance(entry, dict) else entry for entry in entries]
        payload_snapshot["static"] = static
        runtime = payload_snapshot.get("runtime") or {}
        for key in ("uplink", "downlink"):
            direction = runtime.get(key) or {}
            direction.setdefault("interference", None)
            direction.setdefault("ground_lat_deg", 0)
            direction.setdefault("ground_lon_deg", 0)
            direction.setdefault("ground_alt_m", 0)
            runtime[key] = direction
        runtime.setdefault("intermodulation", None)
        payload_snapshot["runtime"] = runtime
        metadata = payload_snapshot.get("metadata") or {}
        overrides = payload_snapshot.get("overrides") or {}
        # Keep only satellite override (legacy fields are dropped)
        overrides = {"satellite": overrides.get("satellite")} if overrides.get("satellite") else None
        payload_snapshot["overrides"] = overrides
        metadata.setdefault("schema_version", "1.1.0")
        payload_snapshot["metadata"] = metadata
        return payload_snapshot

    async def save(self, payload: dict[str, Any]) -> Scenario:
        if "payload_snapshot" in payload:
            snapshot = payload["payload_snapshot"]
            if isinstance(snapshot, dict):
                snapshot = self._backfill_payload(snapshot)
            payload["payload_snapshot"] = jsonable_encoder(snapshot)
        scenario = Scenario(**payload)
        await self.repo.add(scenario)
        await self.repo.session.commit()
        return scenario

    async def get(self, scenario_id: UUID) -> Scenario | None:
        return await self.repo.get(scenario_id)

    async def update(self, scenario_id: UUID, payload: dict[str, Any]) -> Scenario | None:
        scenario = await self.repo.get(scenario_id)
        if not scenario:
            return None
        if "payload_snapshot" in payload:
            snapshot = payload["payload_snapshot"]
            if isinstance(snapshot, dict):
                snapshot = self._backfill_payload(snapshot)
            payload["payload_snapshot"] = jsonable_encoder(snapshot)
        for key, value in payload.items():
            setattr(scenario, key, value)
        await self.repo.session.commit()
        await self.repo.session.refresh(scenario)
        return scenario

    async def list(self, limit: int = 50) -> list[Scenario]:
        return await self.repo.list_recent(limit=limit)

    async def list_paginated(
        self, limit: int = 20, offset: int = 0
    ) -> tuple[list[Scenario], int]:
        items, total = await self.repo.list_recent_paginated(limit=limit, offset=offset)
        return list(items), total

    async def delete(self, scenario_id: UUID) -> bool:
        scenario = await self.repo.get(scenario_id)
        if not scenario:
            return False
        await self.repo.session.delete(scenario)
        try:
            await self.repo.session.commit()
        except IntegrityError:
            await self.repo.session.rollback()
            raise
        return True
