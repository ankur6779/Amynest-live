#!/usr/bin/env bash
# Tight certify loop: close gaps on hot tables, verify immediately.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
mkdir -p scripts/audit/render-to-coolify audit/render-to-coolify

: "${RENDER_DATABASE_URL:?}"
: "${COOLIFY_DATABASE_URL:?}"

WARM_TABLES=(startup_funnel_events user_devices family_digital_twin)
HOT_TABLE=analytics_events

repair() {
  pnpm --filter @workspace/scripts exec tsx ./src/render-to-coolify/repair-table-gap.ts "$1"
}

for attempt in 1 2 3 4 5 6 7 8; do
  echo "=== Certify attempt $attempt ==="
  for t in "${WARM_TABLES[@]}"; do
    repair "$t" || true
  done
  repair "$HOT_TABLE"
  if pnpm run migrate:render-to-coolify:verify; then
    cp scripts/audit/render-to-coolify/verify-latest.json audit/render-to-coolify/verify-latest.json
    cp scripts/audit/render-to-coolify/verify-latest.md audit/render-to-coolify/verify-latest.md
    echo "CERTIFIED"
    exit 0
  fi
  # Sequence-only failures: sync and retry verify once per attempt
  pnpm --filter @workspace/scripts exec tsx ./src/render-to-coolify/sync-sequences.ts || true
done
echo "CERTIFY_FAILED"
exit 1
