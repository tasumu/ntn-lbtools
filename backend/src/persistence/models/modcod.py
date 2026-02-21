import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from src.persistence.database import Base


def utcnow():
    return datetime.now(UTC)


class ModcodTable(Base):
    __tablename__ = "modcod_tables"
    __table_args__ = (
        UniqueConstraint("waveform", "name", name="uq_modcod_waveform_name"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    waveform = Column(String(50), nullable=False)
    version = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    entries = Column(JSONB, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
