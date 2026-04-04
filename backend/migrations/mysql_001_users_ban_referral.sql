-- Superseded by Alembic: alembic/versions/0001_users_ban_referral.py
-- Prefer:  cd backend && alembic upgrade head
-- Or if you already ran this SQL manually:  alembic stamp 0001_users_ban_referral

ALTER TABLE users ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code VARCHAR(16) NULL;
ALTER TABLE users ADD UNIQUE INDEX ix_users_referral_code (referral_code);
ALTER TABLE users ADD COLUMN referred_by_user_id VARCHAR(24) NULL;
ALTER TABLE users ADD INDEX ix_users_referred_by_user_id (referred_by_user_id);
