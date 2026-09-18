#!/usr/bin/env bash
# CI/CD — deploy Cloudflare Worker amynest-api-proxy (www.amynest.in/api/*).
#
# Required GitHub secret: CLOUDFLARE_API_TOKEN with Workers Scripts Edit.
# Pages Edit alone is not enough for this deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/infra/cloudflare/amynest-api-proxy"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN
  echo "[worker-deploy] Using CLOUDFLARE_API_TOKEN."
elif npx --yes wrangler@4 whoami >/dev/null 2>&1; then
  echo "[worker-deploy] CLOUDFLARE_API_TOKEN unset — using wrangler OAuth session (manual fallback)."
else
  echo "[worker-deploy] CLOUDFLARE_API_TOKEN is not set and wrangler is not logged in." >&2
  echo "[worker-deploy] Set the GitHub secret (Workers Scripts Edit) or run: npx wrangler login" >&2
  exit 1
fi

echo "[worker-deploy] Deploying amynest-api-proxy…"
npx --yes wrangler@4 deploy
echo "[worker-deploy] OK"
