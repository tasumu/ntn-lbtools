import uuid
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from src.persistence.database import Base


def utcnow():
    return datetime.now(UTC)


class Scenario(Base):
    __tablename__ = "scenarios"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Draft','Saved','Archived')",
            name="ck_scenarios_status_valid",
        ),
        CheckConstraint("schema_version <> ''", name="ck_scenarios_schema_version_nonempty"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    waveform_strategy = Column(String(50), nullable=False)
    transponder_type = Column(String(50), nullable=False)
    modcod_table_id = Column(UUID(as_uuid=True), nullable=False)
    satellite_id = Column(UUID(as_uuid=True), nullable=True)
    earth_station_tx_id = Column(UUID(as_uuid=True), nullable=True)
    earth_station_rx_id = Column(UUID(as_uuid=True), nullable=True)
    schema_version = Column(String(20), nullable=False, default="1.1.0")
    status = Column(String(30), nullable=False, default="Draft")
    payload_snapshot = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
