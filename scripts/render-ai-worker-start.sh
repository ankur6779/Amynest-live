#!/usr/bin/env bash
# Render amynest-ai-worker start — always build then run (dist/ is gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/artifacts/api-server"
BUNDLE="$API/dist/worker/index.mjs"

cd "$ROOT"

echo "[render-ai-worker] repo=$ROOT"

# Worker runtime often does not retain node_modules from the build phase — install
# api-server + workspace deps so build.mjs can import esbuild.
export NODE_ENV=development
export PNPM_CONFIG_PRODUCTION=false
echo "[render-ai-worker] installing dependencies…"
pnpm install --frozen-lockfile --filter "@workspace/api-server..."

echo "[render-ai-worker] building api-server…"
pnpm --filter @workspace/api-server build

if [[ ! -f "$BUNDLE" ]]; then
  echo "[render-ai-worker] ERROR: bundle missing after build: $BUNDLE" >&2
  ls -la "$API/dist" 2>/dev/null || echo "(no dist dir)"
  exit 1
fi

echo "[render-ai-worker] starting $BUNDLE"
cd "$API"
export AMYNEST_ENV="${AMYNEST_ENV:-production}"
export AMYNEST_AI_WORKER_MODE=standalone
exec node --enable-source-maps "$BUNDLE"
