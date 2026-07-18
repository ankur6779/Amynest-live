#!/usr/bin/env bash
# CI/CD — build kidschedule and deploy static SPA to Cloudflare Pages (amynest-web).
#
# Required GitHub secret: CLOUDFLARE_API_TOKEN (Account → Cloudflare Pages → Edit)
#
# Optional secrets (override firebase-web-defaults at build time):
#   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
#   VITE_FIREBASE_APP_ID, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_VAPID_KEY,
#   VITE_GA4_MEASUREMENT_ID
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer CLOUDFLARE_API_TOKEN (CI). Manual/local: wrangler OAuth session is OK
# when the operator has already run `wrangler login` with Pages Edit scope.
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN
  echo "[pages-deploy] Using CLOUDFLARE_API_TOKEN."
elif npx --yes wrangler@4 whoami >/dev/null 2>&1; then
  echo "[pages-deploy] CLOUDFLARE_API_TOKEN unset — using wrangler OAuth session (manual fallback)."
else
  echo "[pages-deploy] CLOUDFLARE_API_TOKEN is not set and wrangler is not logged in." >&2
  echo "[pages-deploy] Set the GitHub secret or run: npx wrangler login" >&2
  exit 1
fi

export NODE_ENV=production
export CF_PAGES_COMMIT_SHA="${GITHUB_SHA:-}"
export VITE_AMYNEST_ENV=production
export VITE_APP_API_ORIGIN="${VITE_APP_API_ORIGIN:-https://www.amynest.in}"
export VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE="${VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE:-1}"
export VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH="${VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH:-1}"
export VITE_FF_FIRST_VALUE_ACTIVATION="${VITE_FF_FIRST_VALUE_ACTIVATION:-1}"

echo "[pages-deploy] Building production SPA…"
bash scripts/render-frontend-build.sh

COMMIT_HASH="${GITHUB_SHA:-}"
COMMIT_MSG="CI production deploy"
if [[ -n "$COMMIT_HASH" ]]; then
  COMMIT_MSG="CI deploy ${COMMIT_HASH:0:7}"
fi

echo "[pages-deploy] Uploading to Cloudflare Pages (amynest-web)…"
npx --yes wrangler@4 pages deploy artifacts/kidschedule/dist/public \
  --project-name=amynest-web \
  --branch=main \
  ${COMMIT_HASH:+--commit-hash="$COMMIT_HASH"} \
  --commit-message="$COMMIT_MSG"

echo "[pages-deploy] OK"
