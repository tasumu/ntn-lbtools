import uuid
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Column, DateTime, Float, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from src.persistence.database import Base


def utcnow():
    return datetime.now(UTC)


class Satellite(Base):
    __tablename__ = "satellites"
    __table_args__ = (
        UniqueConstraint("name", name="uq_satellites_name"),
        CheckConstraint(
            "(longitude_deg IS NULL) OR (longitude_deg >= -180 AND longitude_deg <= 180)",
            name="ck_satellites_longitude_range",
        ),
        CheckConstraint(
            "(transponder_bandwidth_mhz IS NULL) OR (transponder_bandwidth_mhz > 0)",
            name="ck_satellites_bandwidth_positive",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    orbit_type = Column(String(20), nullable=False)
    longitude_deg = Column(Float, nullable=True)
    inclination_deg = Column(Float, nullable=True)
    transponder_bandwidth_mhz = Column(Float, nullable=True)
    eirp_dbw = Column(Float, nullable=True)
    gt_db_per_k = Column(Float, nullable=True)
    frequency_band = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class EarthStation(Base):
    __tablename__ = "earth_stations"
    __table_args__ = (
        UniqueConstraint("name", name="uq_earth_stations_name"),
        CheckConstraint(
            "(antenna_diameter_m IS NULL) OR (antenna_diameter_m > 0)",
            name="ck_earth_stations_diameter_positive",
        ),
        CheckConstraint(
            "(noise_temperature_k IS NULL) OR (noise_temperature_k > 0)",
            name="ck_earth_stations_noise_temp_positive",
        ),
        CheckConstraint(
            "(latitude_deg IS NULL) OR (latitude_deg >= -90 AND latitude_deg <= 90)",
            name="ck_earth_stations_latitude_range",
        ),
        CheckConstraint(
            "(longitude_deg IS NULL) OR (longitude_deg >= -180 AND longitude_deg <= 180)",
            name="ck_earth_stations_longitude_range",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    antenna_diameter_m = Column(Float, nullable=True)
    antenna_gain_tx_db = Column(Float, nullable=True)
    antenna_gain_rx_db = Column(Float, nullable=True)
    noise_temperature_k = Column(Float, nullable=True)
    eirp_dbw = Column(Float, nullable=True)
    tx_power_dbw = Column(Float, nullable=True)
    gt_db_per_k = Column(Float, nullable=True)
    polarization = Column(String(20), nullable=True)
    latitude_deg = Column(Float, nullable=True)
    longitude_deg = Column(Float, nullable=True)
    altitude_m = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
