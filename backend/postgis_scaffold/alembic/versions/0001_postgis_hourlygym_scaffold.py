"""PostGIS scaffold migration for hourly gym booking.

NOTE:
- This is a template migration for PostgreSQL/PostGIS projects.
- Keep it separate from your current MySQL migration chain.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geography

revision: str = "0001_postgis_hourlygym_scaffold"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = ("postgis_scaffold",)
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("role IN ('admin','user','trainer')", name="ck_users_role"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "apartments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_apartments_name", "apartments", ["name"], unique=False)
    op.create_index("idx_apartments_location", "apartments", ["location"], unique=False, postgresql_using="gist")

    op.create_table(
        "trainers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("certifications", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("experience_years", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="ck_trainers_status"),
        sa.UniqueConstraint("user_id", name="uq_trainers_user_id"),
    )
    op.create_index("ix_trainers_status", "trainers", ["status"], unique=False)
    op.create_index("idx_trainers_location", "trainers", ["location"], unique=False, postgresql_using="gist")

    op.create_table(
        "trainer_apartments",
        sa.Column("trainer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trainers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("apartment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("apartments.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "trainer_availability",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("trainer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trainers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("trainer_id", "slot_start", "slot_end", name="uq_trainer_availability_slot"),
    )
    op.create_index("ix_trainer_availability_trainer_id", "trainer_availability", ["trainer_id"], unique=False)

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trainer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trainers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("apartment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("apartments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'booked'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('booked','cancelled','completed')", name="ck_bookings_status"),
    )
    op.create_index("ix_bookings_trainer_id", "bookings", ["trainer_id"], unique=False)
    op.execute(
        """
        CREATE UNIQUE INDEX uq_trainer_slot_booked
        ON bookings (trainer_id, slot_start, slot_end)
        WHERE status = 'booked'
        """
    )


def downgrade() -> None:
    op.drop_index("uq_trainer_slot_booked", table_name="bookings")
    op.drop_index("ix_bookings_trainer_id", table_name="bookings")
    op.drop_table("bookings")

    op.drop_index("ix_trainer_availability_trainer_id", table_name="trainer_availability")
    op.drop_table("trainer_availability")
    op.drop_table("trainer_apartments")

    op.drop_index("idx_trainers_location", table_name="trainers")
    op.drop_index("ix_trainers_status", table_name="trainers")
    op.drop_table("trainers")

    op.drop_index("idx_apartments_location", table_name="apartments")
    op.drop_index("ix_apartments_name", table_name="apartments")
    op.drop_table("apartments")

    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
