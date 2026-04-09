"""locality, invitations, notifications

Revision ID: 0003_locality_invites_notifications
Revises: 0002_bookings_razorpay_order_id
Create Date: 2026-04-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_locality_invites_notifications"
down_revision: Union[str, None] = "0002_bookings_razorpay_order_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "apartments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("apartment_id", sa.String(length=24), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("locality", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_by_user_id", sa.String(length=24), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("apartment_id"),
    )
    op.create_index("ix_apartments_apartment_id", "apartments", ["apartment_id"], unique=False)
    op.create_index("ix_apartments_city", "apartments", ["city"], unique=False)
    op.create_index("ix_apartments_locality", "apartments", ["locality"], unique=False)
    op.create_index("ix_apartments_name", "apartments", ["name"], unique=False)
    op.create_index("ix_apartments_is_active", "apartments", ["is_active"], unique=False)

    op.create_table(
        "trainer_apartments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("trainer_apartment_id", sa.String(length=24), nullable=False),
        sa.Column("trainer_id", sa.String(length=24), nullable=False),
        sa.Column("apartment_id", sa.String(length=24), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["apartment_id"], ["apartments.apartment_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trainer_id"], ["trainers.trainer_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trainer_apartment_id"),
    )
    op.create_index("ix_trainer_apartments_trainer_id", "trainer_apartments", ["trainer_id"], unique=False)
    op.create_index("ix_trainer_apartments_apartment_id", "trainer_apartments", ["apartment_id"], unique=False)
    op.create_index("ix_trainer_apartments_active", "trainer_apartments", ["active"], unique=False)

    op.create_table(
        "trainer_invitations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("invitation_id", sa.String(length=24), nullable=False),
        sa.Column("user_id", sa.String(length=24), nullable=False),
        sa.Column("trainer_id", sa.String(length=24), nullable=False),
        sa.Column("apartment_id", sa.String(length=24), nullable=False),
        sa.Column("date", sa.String(length=20), nullable=False),
        sa.Column("start_time", sa.String(length=10), nullable=False),
        sa.Column("end_time", sa.String(length=10), nullable=False),
        sa.Column("workout", sa.String(length=120), nullable=True),
        sa.Column("amount", sa.DECIMAL(10, 2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("PENDING", "ACCEPTED", "REJECTED", "BOOKING_INITIATED", "CANCELLED", name="invitationstatusenum"),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.Column("booking_id", sa.String(length=24), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["apartment_id"], ["apartments.apartment_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.booking_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trainer_id"], ["trainers.trainer_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invitation_id"),
    )
    op.create_index("ix_trainer_invitations_invitation_id", "trainer_invitations", ["invitation_id"], unique=False)
    op.create_index("ix_trainer_invitations_user_id", "trainer_invitations", ["user_id"], unique=False)
    op.create_index("ix_trainer_invitations_trainer_id", "trainer_invitations", ["trainer_id"], unique=False)
    op.create_index("ix_trainer_invitations_apartment_id", "trainer_invitations", ["apartment_id"], unique=False)
    op.create_index("ix_trainer_invitations_status", "trainer_invitations", ["status"], unique=False)
    op.create_index("ix_trainer_invitations_booking_id", "trainer_invitations", ["booking_id"], unique=False)

    op.create_table(
        "user_notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("notification_id", sa.String(length=24), nullable=False),
        sa.Column("user_id", sa.String(length=24), nullable=False),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("notification_id"),
    )
    op.create_index("ix_user_notifications_notification_id", "user_notifications", ["notification_id"], unique=False)
    op.create_index("ix_user_notifications_user_id", "user_notifications", ["user_id"], unique=False)
    op.create_index("ix_user_notifications_kind", "user_notifications", ["kind"], unique=False)
    op.create_index("ix_user_notifications_is_read", "user_notifications", ["is_read"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_notifications_is_read", table_name="user_notifications")
    op.drop_index("ix_user_notifications_kind", table_name="user_notifications")
    op.drop_index("ix_user_notifications_user_id", table_name="user_notifications")
    op.drop_index("ix_user_notifications_notification_id", table_name="user_notifications")
    op.drop_table("user_notifications")

    op.drop_index("ix_trainer_invitations_booking_id", table_name="trainer_invitations")
    op.drop_index("ix_trainer_invitations_status", table_name="trainer_invitations")
    op.drop_index("ix_trainer_invitations_apartment_id", table_name="trainer_invitations")
    op.drop_index("ix_trainer_invitations_trainer_id", table_name="trainer_invitations")
    op.drop_index("ix_trainer_invitations_user_id", table_name="trainer_invitations")
    op.drop_index("ix_trainer_invitations_invitation_id", table_name="trainer_invitations")
    op.drop_table("trainer_invitations")

    op.drop_index("ix_trainer_apartments_active", table_name="trainer_apartments")
    op.drop_index("ix_trainer_apartments_apartment_id", table_name="trainer_apartments")
    op.drop_index("ix_trainer_apartments_trainer_id", table_name="trainer_apartments")
    op.drop_table("trainer_apartments")

    op.drop_index("ix_apartments_is_active", table_name="apartments")
    op.drop_index("ix_apartments_name", table_name="apartments")
    op.drop_index("ix_apartments_locality", table_name="apartments")
    op.drop_index("ix_apartments_city", table_name="apartments")
    op.drop_index("ix_apartments_apartment_id", table_name="apartments")
    op.drop_table("apartments")
