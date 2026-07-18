#!/usr/bin/env bash
# Production SPA build for Cloudflare Pages (historically also used on Render static).
# Installs kidschedule + scripts workspace tooling (prebuild gates need tsx).
set -euo pipefail
set -x

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
elif ! command -v pnpm >/dev/null 2>&1; then
  echo "[render-frontend-build] pnpm/corepack not found" >&2
  exit 1
fi

# Install MUST include devDependencies (tsx) used by kidschedule prebuild gates.
# NODE_ENV=production during install skips devDependencies even with PNPM_CONFIG_PRODUCTION=false.
unset NODE_ENV || true
export PNPM_CONFIG_PRODUCTION=false

# pnpm install --frozen-lockfile is the pnpm equivalent of npm ci.
pnpm fetch --frozen-lockfile
# kidschedule... does not pull @workspace/scripts (prebuild invokes it via pnpm --filter).
pnpm install --frozen-lockfile --offline \
  --filter "@workspace/kidschedule..." \
  --filter "@workspace/scripts..."

# Vite must see production so import.meta.env.PROD=true and dev-route redirects compile out.
export NODE_ENV=production
BASE_PATH=/ PORT=3000 pnpm --filter @workspace/kidschedule build
pnpm --filter @workspace/kidschedule validate:seo

echo "[render-frontend-build] OK"
