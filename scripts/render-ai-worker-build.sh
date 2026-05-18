#!/usr/bin/env bash
# Full Render BUILD command for amynest-ai-worker (paste into dashboard Build Command).
set -euo pipefail
set -x

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

corepack enable
corepack prepare pnpm@9.15.0 --activate
export NODE_ENV=development
export PNPM_CONFIG_PRODUCTION=false

pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server build
test -f artifacts/api-server/dist/worker/index.mjs
test -f artifacts/api-server/dist/index.mjs
ls -la artifacts/api-server/dist/worker/

echo "[render-ai-worker-build] OK"
