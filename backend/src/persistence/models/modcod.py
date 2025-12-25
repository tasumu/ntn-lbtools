import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from src.persistence.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class ModcodTable(Base):
    __tablename__ = "modcod_tables"
    __table_args__ = (
        UniqueConstraint("waveform", "version", name="uq_modcod_waveform_version"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    waveform = Column(String(50), nullable=False)
    version = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    entries = Column(JSONB, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
