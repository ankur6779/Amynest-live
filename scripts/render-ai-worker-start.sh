#!/usr/bin/env bash
# Render amynest-ai-worker — install, build dist/worker/index.mjs, then run it.
set -euo pipefail
set -x

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/artifacts/api-server"
BUNDLE="$API/dist/worker/index.mjs"

cd "$ROOT"
echo "[render-ai-worker] ROOT=$ROOT"
echo "[render-ai-worker] PWD=$(pwd)"

if [[ ! -f "$API/package.json" ]]; then
  echo "[render-ai-worker] ERROR: api-server not found at $API" >&2
  echo "[render-ai-worker] If Render Root Directory is artifacts/api-server, set Start Command to: bash render-worker-start.sh" >&2
  exit 1
fi

corepack enable
corepack prepare pnpm@9.15.0 --activate

export NODE_ENV=development
export PNPM_CONFIG_PRODUCTION=false

echo "[render-ai-worker] pnpm install (api-server + deps)…"
pnpm install --frozen-lockfile --filter "@workspace/api-server..."

echo "[render-ai-worker] pnpm build…"
pnpm --filter @workspace/api-server build

if [[ ! -f "$BUNDLE" ]]; then
  echo "[render-ai-worker] ERROR: bundle missing after build: $BUNDLE" >&2
  ls -laR "$API/dist" 2>/dev/null || echo "(no dist tree)"
  exit 1
fi

ls -la "$BUNDLE"
echo "[render-ai-worker] starting worker…"
cd "$API"
export AMYNEST_ENV="${AMYNEST_ENV:-production}"
export AMYNEST_AI_WORKER_MODE=standalone
exec node --enable-source-maps "$BUNDLE"
