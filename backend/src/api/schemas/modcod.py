from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator
from pydantic.config import ConfigDict


class ModcodEntry(BaseModel):
    id: str
    modulation: str
    code_rate: str
    required_ebno_db: float | None = None  # Preferred: Eb/N0 threshold (dB)
    required_cn0_dbhz: float | None = None  # Optional: C/N0 threshold (dB-Hz)
    info_bits_per_symbol: float  # Information bits per symbol (rolloff-independent)
    rolloff: float | None = None
    pilots: bool | None = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @field_validator(
        "required_ebno_db",
        "required_cn0_dbhz",
        "rolloff",
        mode="before",
    )
    @classmethod
    def coerce_numbers(cls, v):
        if v is None:
            return v
        return float(v)

    @field_validator("info_bits_per_symbol")
    @classmethod
    def require_info_bits(cls, v: float):
        if v is None:
            raise ValueError("info_bits_per_symbol is required")
        if v <= 0:
            raise ValueError("info_bits_per_symbol must be positive")
        return float(v)


class ModcodTableBase(BaseModel):
    waveform: str
    version: str
    description: str | None = None
    entries: list[ModcodEntry]

    @field_validator("entries")
    @classmethod
    def require_threshold(cls, v: list[ModcodEntry]):
        for entry in v:
            if entry.required_cn0_dbhz is None and entry.required_ebno_db is None:
                raise ValueError("Each entry must provide required_cn0_dbhz or required_ebno_db")
        return v


class ModcodTableCreate(ModcodTableBase):
    pass


class ModcodTableRead(ModcodTableBase):
    id: UUID
    published_at: datetime | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
