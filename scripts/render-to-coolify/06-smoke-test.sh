#!/usr/bin/env bash
# Phase 2b — Automated smoke tests against Coolify backend (run after every verification).
#
#   export COOLIFY_API_URL='https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io'
#   export SMOKE_FIREBASE_ID_TOKEN='eyJ...'   # or mint via SMOKE_FIREBASE_UID + SA JSON
#   export INTERNAL_HEALTH_SECRET='...'       # for /api/healthz/env readiness
#   export REVENUECAT_WEBHOOK_SECRET='...'    # webhook validation path
#   export SMOKE_WORKER_HEALTH_URL='http://127.0.0.1:9090/health'  # optional, on worker host
#
#   bash scripts/render-to-coolify/06-smoke-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${COOLIFY_API_URL:-}" ]]; then
  echo "Set COOLIFY_API_URL (Coolify backend public HTTPS URL)."
  exit 1
fi

pnpm run migrate:render-to-coolify:smoke "$@"
