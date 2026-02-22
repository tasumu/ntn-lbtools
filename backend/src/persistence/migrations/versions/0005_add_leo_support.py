"""Add altitude_km, tle_line1, tle_line2 to satellites for LEO support."""

import sqlalchemy as sa

from alembic import op

revision = "0005_add_leo_support"
down_revision = "0004_add_modcod_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("satellites", sa.Column("altitude_km", sa.Float, nullable=True))
    op.add_column("satellites", sa.Column("tle_line1", sa.String(80), nullable=True))
    op.add_column("satellites", sa.Column("tle_line2", sa.String(80), nullable=True))

    op.create_check_constraint(
        "ck_satellites_altitude_positive",
        "satellites",
        "(altitude_km IS NULL) OR (altitude_km > 0)",
    )
    op.create_check_constraint(
        "ck_satellites_tle_pair",
        "satellites",
        "(tle_line1 IS NULL) = (tle_line2 IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_satellites_tle_pair", "satellites", type_="check")
    op.drop_constraint("ck_satellites_altitude_positive", "satellites", type_="check")
    op.drop_column("satellites", "tle_line2")
    op.drop_column("satellites", "tle_line1")
    op.drop_column("satellites", "altitude_km")
