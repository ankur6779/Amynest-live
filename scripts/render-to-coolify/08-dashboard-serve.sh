#!/usr/bin/env bash
# Open migration dashboard (generates snapshot then serves HTML).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

bash "$(dirname "$0")/07-canary-monitor.sh" --once "$@" || true

PORT="${MIGRATION_DASHBOARD_PORT:-8799}"
echo "Dashboard: http://127.0.0.1:${PORT}/dashboard.html"
echo "JSON:      audit/render-to-coolify/dashboard-latest.json"
cd audit/render-to-coolify
python3 -m http.server "$PORT"
