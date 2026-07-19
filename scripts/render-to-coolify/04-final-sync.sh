#!/usr/bin/env bash
# Phase 4 — Final synchronization immediately before cutover (still no DNS change).
#
# 1. Record final snapshot time
# 2. Delta sync with --final (includes tables without timestamps)
# 3. Fix sequences
# 4. Verify replica (must PASS)
#
# Render remains live throughout. Run during a low-traffic window.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${RENDER_DATABASE_URL:-}" || -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set RENDER_DATABASE_URL and COOLIFY_DATABASE_URL."
  exit 1
fi

echo "==> Delta sync (incremental since initial snapshot)..."
pnpm run migrate:render-to-coolify:delta "$@"

echo "==> Delta sync (--final: tables without timestamps)..."
pnpm run migrate:render-to-coolify:delta -- --final "$@"

echo "==> Fixing sequences..."
bash "$(dirname "$0")/05-fix-sequences.sh"

echo "==> Verifying replica..."
bash "$(dirname "$0")/02-verify-replica.sh"

echo ""
echo "Final sync complete. Review:"
echo "  audit/render-to-coolify/verify-latest.md"
echo "  audit/render-to-coolify/smoke-latest.md"
echo "Do NOT cut over until both reports pass."
