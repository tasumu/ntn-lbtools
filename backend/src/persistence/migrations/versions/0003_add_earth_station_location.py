"""Add latitude_deg, longitude_deg, altitude_m to earth_stations."""

import sqlalchemy as sa

from alembic import op

revision = "0003_es_location"
down_revision = "0002_idx_created"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("earth_stations", sa.Column("latitude_deg", sa.Float, nullable=True))
    op.add_column("earth_stations", sa.Column("longitude_deg", sa.Float, nullable=True))
    op.add_column("earth_stations", sa.Column("altitude_m", sa.Float, nullable=True))
    op.create_check_constraint(
        "ck_earth_stations_latitude_range",
        "earth_stations",
        "(latitude_deg IS NULL) OR (latitude_deg >= -90 AND latitude_deg <= 90)",
    )
    op.create_check_constraint(
        "ck_earth_stations_longitude_range",
        "earth_stations",
        "(longitude_deg IS NULL) OR (longitude_deg >= -180 AND longitude_deg <= 180)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_earth_stations_longitude_range", "earth_stations", type_="check")
    op.drop_constraint("ck_earth_stations_latitude_range", "earth_stations", type_="check")
    op.drop_column("earth_stations", "altitude_m")
    op.drop_column("earth_stations", "longitude_deg")
    op.drop_column("earth_stations", "latitude_deg")
