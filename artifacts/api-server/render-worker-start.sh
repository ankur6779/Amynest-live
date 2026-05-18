#!/usr/bin/env bash
# Use when Render "Root Directory" is artifacts/api-server (monorepo subfolder).
set -euo pipefail
PKG="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$PKG/../.." && pwd)"
exec bash "$ROOT/scripts/render-ai-worker-start.sh"
