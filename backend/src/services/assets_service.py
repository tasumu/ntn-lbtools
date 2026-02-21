from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.persistence.models.assets import EarthStation, Satellite
from src.persistence.repositories.assets import EarthStationRepository, SatelliteRepository


class AssetsService:
    def __init__(self, session: AsyncSession):
        self.sat_repo = SatelliteRepository(session)
        self.es_repo = EarthStationRepository(session)

    async def create_satellite(self, data: dict) -> Satellite:
        sat = Satellite(**data)
        await self.sat_repo.add(sat)
        await self.sat_repo.session.commit()
        return sat

    async def delete_satellite(self, sat_id: UUID) -> bool:
        sat = await self.sat_repo.get(sat_id)
        if not sat:
            return False
        await self.sat_repo.session.delete(sat)
        try:
            await self.sat_repo.session.commit()
        except IntegrityError:
            await self.sat_repo.session.rollback()
            raise
        return True

    async def update_satellite(self, sat_id: UUID, data: dict) -> Satellite | None:
        sat = await self.sat_repo.get(sat_id)
        if not sat:
            return None
        for k, v in data.items():
            setattr(sat, k, v)
        await self.sat_repo.session.commit()
        await self.sat_repo.session.refresh(sat)
        return sat

    async def list_satellites(self) -> list[Satellite]:
        return await self.sat_repo.list_all()

    async def list_satellites_paginated(
        self, limit: int = 20, offset: int = 0,
    ) -> tuple[list[Satellite], int]:
        items, total = await self.sat_repo.list_all_paginated(limit=limit, offset=offset)
        return list(items), total

    async def create_earth_station(self, data: dict) -> EarthStation:
        es = EarthStation(**data)
        await self.es_repo.add(es)
        await self.es_repo.session.commit()
        return es

    async def delete_earth_station(self, es_id: UUID) -> bool:
        es = await self.es_repo.get(es_id)
        if not es:
            return False
        await self.es_repo.session.delete(es)
        try:
            await self.es_repo.session.commit()
        except IntegrityError:
            await self.es_repo.session.rollback()
            raise
        return True

    async def update_earth_station(self, es_id: UUID, data: dict) -> EarthStation | None:
        es = await self.es_repo.get(es_id)
        if not es:
            return None
        for k, v in data.items():
            setattr(es, k, v)
        await self.es_repo.session.commit()
        await self.es_repo.session.refresh(es)
        return es

    async def list_earth_stations(self) -> list[EarthStation]:
        return await self.es_repo.list_all()

    async def list_earth_stations_paginated(
        self, limit: int = 20, offset: int = 0,
    ) -> tuple[list[EarthStation], int]:
        items, total = await self.es_repo.list_all_paginated(limit=limit, offset=offset)
        return list(items), total
