# HourlyGym backend

Two entry points live in this folder:

| File | Stack | Run |
|------|--------|-----|
| **`main.py`** | MySQL + SQLAlchemy + JWT + SendGrid SMTP | `python -m uvicorn main:app --reload --port 8000` |
| **`server.py`** | Legacy MongoDB + cookie/session (older UI) | `python -m uvicorn server:app --reload --port 8000` |

## New stack (`main.py`)

1. Copy `backend/.env.example` → `backend/.env` and fill secrets (never commit `.env`).
2. Install deps: `pip install -r requirements.txt`
3. Start: `python -m uvicorn main:app --reload --port 8000`

## Layout

- `routers/` — HTTP routes (thin)
- `services/` — business logic
- `models/` — SQLAlchemy tables
- `schemas/` — Pydantic request/response models
- `utils/` — JWT, password hashing, geo helpers
