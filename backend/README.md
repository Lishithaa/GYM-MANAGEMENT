# HourlyGym backend

Two entry points live in this folder:

| File | Stack | Run |
|------|--------|-----|
| **`main.py`** | MySQL + SQLAlchemy + JWT + SendGrid SMTP | `python -m uvicorn main:app --reload --port 8000` |
| **`server.py`** | Legacy MongoDB + cookie/session (older UI) | `python -m uvicorn server:app --reload --port 8000` |

## New stack (`main.py`)

1. Copy `backend/.env.example` → `backend/.env` and fill secrets (never commit `.env`).
2. Install deps:
   - Normal: `pip install -r requirements.txt`
   - **Low disk space:** use the small set only (no ML/Google/litellm stack):
     `pip install --no-cache-dir -r requirements-app.txt`
3. Start: `python -m uvicorn main:app --reload --port 8000`

## Database migrations (Alembic)

Schema changes are tracked under `alembic/versions/`. `env.py` imports `models.tables` so all ORM tables are on `Base.metadata` for **`alembic revision --autogenerate`** on a clean or stamped database.

Uses a **sync** URL (`mysql+pymysql://…`) derived from `DATABASE_URL` (`mysql+aiomysql://…` is rewritten). **PyMySQL** is already pulled in via `aiomysql`.

```bash
cd backend
source venv/bin/activate
# Apply migrations
alembic upgrade head
# New change from models (review the generated file before committing)
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

If you **already applied** the old raw SQL patch for `users` columns, mark this revision as done without running SQL again:

```bash
alembic stamp 0001_users_ban_referral
```

## Layout

- `routers/` — HTTP routes (thin)
- `services/` — business logic
- `models/` — SQLAlchemy tables
- `schemas/` — Pydantic request/response models
- `utils/` — JWT, password hashing, geo helpers
