"""bookings: razorpay_order_id

Revision ID: 0002_bookings_razorpay_order_id
Revises: 0001_users_ban_referral
Create Date: 2026-04-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_bookings_razorpay_order_id"
down_revision: Union[str, None] = "0001_users_ban_referral"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("razorpay_order_id", sa.String(length=64), nullable=True))
    op.create_index("ix_bookings_razorpay_order_id", "bookings", ["razorpay_order_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_bookings_razorpay_order_id", table_name="bookings")
    op.drop_column("bookings", "razorpay_order_id")
