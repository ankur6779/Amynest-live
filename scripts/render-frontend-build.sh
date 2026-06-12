#!/usr/bin/env bash
# Render BUILD command for Amynest-live-1 (static frontend).
# Split from backend — installs only kidschedule workspace deps.
set -euo pipefail
set -x

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

corepack enable
corepack prepare pnpm@9.15.0 --activate
# Must be production so Vite sets import.meta.env.PROD=true and compiles dev-route redirects.
export NODE_ENV=production
export PNPM_CONFIG_PRODUCTION=false

# pnpm install --frozen-lockfile is the pnpm equivalent of npm ci.
pnpm fetch --frozen-lockfile
pnpm install --frozen-lockfile --offline --filter "@workspace/kidschedule..."

BASE_PATH=/ PORT=3000 pnpm --filter @workspace/kidschedule build

echo "[render-frontend-build] OK"
