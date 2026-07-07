#!/usr/bin/env bash
# ==========================================================================
# One-command LOCAL dev stack for AmyNest (this MacBook).
#
#   pnpm run dev:local
#
# Boots, against LOCAL services only (see repo-root .env.development):
#   - API server   http://localhost:5001   (tsx watch, hot reload)
#   - AI worker    (BullMQ + local Redis, tsx watch)
#   - Web (Vite)   http://localhost:3000    (SPA -> local API)
#
# Requires (checked below): PostgreSQL (amynest_dev) + Redis running locally.
# Ctrl-C stops all three processes together.
# ==========================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env.development ]]; then
  echo "ERROR: .env.development not found at repo root. Create it first." >&2
  exit 1
fi

# --- Preflight: PostgreSQL ---------------------------------------------------
if ! PGPASSWORD=amynest psql -U amynest -h localhost -d amynest_dev -tc "select 1" >/dev/null 2>&1; then
  echo "ERROR: cannot reach local Postgres db 'amynest_dev' as user 'amynest'." >&2
  echo "       Start it with:  brew services start postgresql@16" >&2
  exit 1
fi
echo "[dev-local] Postgres amynest_dev: OK"

# --- Preflight: Redis (optional but expected for worker) ---------------------
REDIS_CLI="$(command -v redis-cli || echo /usr/local/opt/redis/bin/redis-cli)"
if "$REDIS_CLI" ping >/dev/null 2>&1; then
  echo "[dev-local] Redis: OK"
else
  echo "[dev-local] WARNING: Redis not responding. Start it with: brew services start redis" >&2
  echo "[dev-local] Continuing — the API/worker will fall back to the in-memory queue." >&2
fi

# --- Run API + worker + web together, clean shutdown on Ctrl-C ---------------
pids=()
cleanup() {
  echo ""
  echo "[dev-local] shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

echo "[dev-local] starting API (:5001), worker, and web (:3000)..."
pnpm run dev:api & pids+=($!)
pnpm run dev:worker & pids+=($!)
pnpm run dev:web & pids+=($!)

wait
