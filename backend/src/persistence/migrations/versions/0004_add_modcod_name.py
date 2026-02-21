"""Add name column to modcod_tables, change unique constraint."""

import sqlalchemy as sa

from alembic import op

revision = "0004_add_modcod_name"
down_revision = "0003_es_location"
branch_labels = None
depends_on = None

SAMPLE_MODCOD_ID = "00000000-0000-0000-0000-00000000d001"


def upgrade() -> None:
    # 1. Add name column (nullable initially for backfill)
    op.add_column("modcod_tables", sa.Column("name", sa.String(255), nullable=True))

    # 2. Backfill: copy version into name for existing rows
    op.execute(sa.text("UPDATE modcod_tables SET name = version WHERE name IS NULL"))

    # 3. Make name NOT NULL
    op.alter_column("modcod_tables", "name", nullable=False)

    # 4. Make version nullable
    op.alter_column("modcod_tables", "version", nullable=True)

    # 5. Drop old unique constraint
    op.drop_constraint("uq_modcod_waveform_version", "modcod_tables", type_="unique")

    # 6. Create new unique constraint
    op.create_unique_constraint("uq_modcod_waveform_name", "modcod_tables", ["waveform", "name"])

    # 7. Update seed data name to something descriptive
    op.execute(
        sa.text(
            "UPDATE modcod_tables SET name = 'Sample Standard' "
            "WHERE id = CAST(:id AS UUID)",
        ).bindparams(id=SAMPLE_MODCOD_ID),
    )


def downgrade() -> None:
    # Backfill version from name where version is NULL
    op.execute(
        sa.text("UPDATE modcod_tables SET version = name WHERE version IS NULL"),
    )

    # Restore seed data version
    op.execute(
        sa.text(
            "UPDATE modcod_tables SET version = 'sample-1.0.0' "
            "WHERE id = CAST(:id AS UUID)",
        ).bindparams(id=SAMPLE_MODCOD_ID),
    )

    # Swap constraints
    op.drop_constraint("uq_modcod_waveform_name", "modcod_tables", type_="unique")
    op.create_unique_constraint(
        "uq_modcod_waveform_version", "modcod_tables", ["waveform", "version"],
    )

    # Make version NOT NULL again
    op.alter_column("modcod_tables", "version", nullable=False)

    # Drop name column
    op.drop_column("modcod_tables", "name")
