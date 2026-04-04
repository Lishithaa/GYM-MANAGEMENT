"""users: is_banned, referral_code, referred_by_user_id

Revision ID: 0001_users_ban_referral
Revises:
Create Date: 2026-04-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_users_ban_referral"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column("users", sa.Column("referral_code", sa.String(length=16), nullable=True))
    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)
    op.add_column("users", sa.Column("referred_by_user_id", sa.String(length=24), nullable=True))
    op.create_index(
        "ix_users_referred_by_user_id",
        "users",
        ["referred_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_users_referred_by_user_id", table_name="users")
    op.drop_column("users", "referred_by_user_id")
    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_column("users", "referral_code")
    op.drop_column("users", "is_banned")
