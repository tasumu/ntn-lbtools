"""Add index on scenarios.created_at for ORDER BY performance."""

from alembic import op

revision = "0002_idx_created"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_scenarios_created_at", "scenarios", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_scenarios_created_at", table_name="scenarios")
