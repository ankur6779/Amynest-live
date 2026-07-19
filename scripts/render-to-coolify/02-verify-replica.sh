#!/usr/bin/env bash
# Phase 2 — Verify Coolify is an exact replica of Render PostgreSQL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${RENDER_DATABASE_URL:-}" || -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set RENDER_DATABASE_URL and COOLIFY_DATABASE_URL."
  exit 1
fi

pnpm run migrate:render-to-coolify:verify "$@"

if [[ -z "${COOLIFY_API_URL:-}" ]]; then
  echo ""
  echo "[verify] COOLIFY_API_URL unset — skipping backend smoke tests."
  echo "         Set COOLIFY_API_URL and re-run, or: bash scripts/render-to-coolify/06-smoke-test.sh"
  exit 0
fi

echo ""
echo "==> Running Coolify backend smoke tests..."
bash "$(dirname "$0")/06-smoke-test.sh" "$@"
