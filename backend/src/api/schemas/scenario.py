from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from pydantic.config import ConfigDict

from src.api.schemas.calculation import ScenarioPayload, TransponderType, WaveformStrategy


class ScenarioStatus(str, Enum):
    DRAFT = "Draft"
    SAVED = "Saved"
    ARCHIVED = "Archived"


class ScenarioBase(BaseModel):
    name: str
    description: str | None = None
    waveform_strategy: WaveformStrategy
    transponder_type: TransponderType
    modcod_table_id: UUID
    satellite_id: UUID | None = None
    earth_station_tx_id: UUID | None = None
    earth_station_rx_id: UUID | None = None
    schema_version: str = Field(default="1.1.0")
    status: ScenarioStatus = ScenarioStatus.DRAFT
    payload_snapshot: ScenarioPayload | dict[str, Any] | None = Field(default_factory=dict)

    # Allow legacy/partial payload_snapshot content when reading existing records.
    model_config = ConfigDict(extra="ignore")


class ScenarioCreate(ScenarioBase):
    payload_snapshot: ScenarioPayload | dict[str, Any]

    model_config = ConfigDict(extra="forbid")


class ScenarioRead(ScenarioBase):
    id: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")
