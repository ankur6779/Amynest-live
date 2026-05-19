#!/usr/bin/env bash
# Apply Drizzle schema to production/staging Postgres (requires DATABASE_URL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Example: DATABASE_URL='postgresql://...' bash scripts/push-production-schema.sh" >&2
  exit 1
fi

echo "[schema] Running drizzle-kit push against DATABASE_URL..."
pnpm --filter @workspace/db push

echo "[schema] Drizzle push complete."
