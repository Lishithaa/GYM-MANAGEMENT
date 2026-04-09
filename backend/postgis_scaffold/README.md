# PostGIS FastAPI Scaffold

This folder contains a standalone scaffold for:
- trainer onboarding + admin approval
- apartment-based trainer discovery
- PostGIS radius filtering with `ST_DWithin`
- trainer availability + booking with double-booking protection

## Files
- `models.py`: SQLAlchemy models for PostgreSQL/PostGIS
- `schemas.py`: Pydantic request/response schemas
- `geo_queries.py`: geo filtering query helper
- `routers.py`: FastAPI routes requested in the spec
- `alembic/versions/0001_postgis_hourlygym_scaffold.py`: migration template

## Required packages
Install in backend env:

```bash
pip install geoalchemy2 shapely psycopg2-binary
```

## Integration steps
1. Wire real DB session in `routers.py -> get_db()`.
2. Replace auth stubs in `deps.py` with your JWT dependencies.
3. Include router in your app:

```python
from postgis_scaffold.routers import router as postgis_router
app.include_router(postgis_router)
```

4. If moving to PostgreSQL, run scaffold migration in a Postgres-based Alembic environment.
