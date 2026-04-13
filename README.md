# HourlyGym

Monorepo layout (this folder is the **Git and Docker root**):

| Path | Stack | Key manifest |
|------|--------|----------------|
| `frontend/` | React (CRA + Craco) | `package.json`, `yarn.lock` |
| `backend/` | FastAPI + MySQL | `requirements.txt`, `main.py` |

## Local development

- **Backend:** see `backend/README.md` — copy `backend/.env.example` → `backend/.env`, then e.g. `uvicorn main:app --reload --port 8000`.
- **Frontend:** see `frontend/README.md` — copy `frontend/.env.example` → `frontend/.env`, then `yarn start` (port 3000).

## Docker

1. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, `JWT_SECRET`, and other secrets.
2. From **this directory** (`GYM-MANAGEMENT/`):

   ```bash
   docker compose up --build
   ```

3. Open **http://localhost:3000** (nginx static UI). API: **http://localhost:8000**.

Set `REACT_APP_BACKEND_URL` when building the frontend image if the API is not at `http://127.0.0.1:8000` from the browser (e.g. deploy hostname).

Optional overrides: `docker-compose.override.yml` (gitignored) or shell env vars `REACT_APP_BACKEND_URL`, `CORS_ORIGINS`, `FRONTEND_URL`.

Root `package.json` exposes `npm run docker:up` / `docker:down` as aliases to Compose.

## DigitalOcean App Platform

Deploy **both** UI and API with [`.do/app.yaml`](.do/app.yaml) (two services + ingress). A single component built from the repo-root `Dockerfile` is API-only and will not serve the React app on `/`.

- **UI:** Apps → your app → **Settings** → **App spec** → paste the YAML from `.do/app.yaml`, save (merge in any existing database component if needed).
- **CLI:** `DO_APP_ID=<uuid> ./scripts/do-apply-app-spec.sh` (requires [doctl](https://docs.digitalocean.com/reference/doctl/how-to/install/)).

### Docker: BuildKit `metadata_v2.db` / `containerdmeta.db` I/O error

That comes from **Docker Desktop’s disk image** (full, corrupted, or bad I/O), not from this repo.

1. **Use the classic builder (often works when BuildKit is broken):**
   ```bash
   export DOCKER_BUILDKIT=0
   export COMPOSE_DOCKER_CLI_BUILD=0
   docker compose build --no-cache
   ```
2. **Docker Desktop → Troubleshoot:** Clean / purge data, or **Reset to factory defaults** (removes local images).
3. **macOS:** Free disk space; **Disk Utility → First Aid** on your startup volume.
4. Still failing: reinstall Docker Desktop or increase **Settings → Resources → Disk image size**.

### Docker: `read-only file system` under `/var/lib/docker/tmp`

The Docker VM’s disk is **read-only** (often after I/O errors, a full disk, or a corrupted Docker data image). BuildKit and classic builds will both fail until Docker’s storage is healthy.

1. **Quit Docker Desktop** completely, then start it again.
2. **Docker Desktop → Troubleshoot → Reset to factory defaults** (or *Clean / Purge data*). This recreates the disk image; you lose local images/containers.
3. **macOS:** Ensure you have **several GB free** on the startup disk.
4. If it returns: **reinstall Docker Desktop**; run **Disk Utility → First Aid** on your Mac volume.

Until Docker is fixed, run the app **without Docker**: backend `uvicorn` + frontend `yarn start` (see **Local development** above).
