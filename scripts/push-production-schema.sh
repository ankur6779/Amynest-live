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

# Render Postgres requires SSL; drizzle.config.ts normalizes host + sslmode.
if [[ "$DATABASE_URL" != *"sslmode="* ]] && [[ "$DATABASE_URL" == *"render.com"* ]]; then
  echo "[schema] Tip: Render URLs work best with sslmode=require (auto-applied in drizzle.config.ts)."
fi

echo "[schema] Running drizzle-kit push against DATABASE_URL..."
if ! pnpm --filter @workspace/db push; then
  echo "" >&2
  echo "[schema] FAILED — common fixes:" >&2
  echo "  1. Use Render Postgres → Connect → External Database URL (not Internal)." >&2
  echo "  2. URL-encode special characters in the password (@ → %40, # → %23)." >&2
  echo "  3. Append ?sslmode=require if connecting to Render from your laptop." >&2
  echo "  4. Local dev: docker compose --profile local up postgres -d" >&2
  exit 1
fi

echo "[schema] Drizzle push complete."
