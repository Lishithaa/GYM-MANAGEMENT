#!/usr/bin/env bash
# Apply .do/app.yaml to an existing DigitalOcean App (needs doctl + DO auth).
# Usage: DO_APP_ID=<uuid> ./scripts/do-apply-app-spec.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$ROOT/.do/app.yaml"
if ! command -v doctl >/dev/null 2>&1; then
  echo "Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
  exit 1
fi
if [[ -z "${DO_APP_ID:-}" ]]; then
  echo "Set DO_APP_ID to your app UUID (Apps → your app → URL …/apps/<uuid>)."
  echo "List apps: doctl apps list"
  exit 1
fi
doctl apps update "$DO_APP_ID" --spec "$SPEC"
echo "Spec applied. Watch deploy: doctl apps list"
