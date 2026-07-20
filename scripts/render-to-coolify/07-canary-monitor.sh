#!/usr/bin/env bash
# Canary monitor — live Render vs Coolify comparison + stage advancement.
#
#   export RENDER_API_URL='https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io'
#   export COOLIFY_API_URL='https://...'
#   export SMOKE_FIREBASE_ID_TOKEN='...'
#   export RENDER_DATABASE_URL='...'    # optional row counts
#   export COOLIFY_DATABASE_URL='...'
#
# Single check:
#   bash scripts/render-to-coolify/07-canary-monitor.sh --once
#
# Live dashboard loop (60s):
#   bash scripts/render-to-coolify/07-canary-monitor.sh --watch --advance
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

pnpm run migrate:render-to-coolify:canary-monitor -- "$@"
