#!/usr/bin/env bash
# Mint SMOKE_FIREBASE_ID_TOKEN for coolify smoke tests (optional helper).
#
# Requires on Coolify backend / local env:
#   SMOKE_FIREBASE_UID, FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_WEB_API_KEY (or VITE_FIREBASE_API_KEY)
#
# Usage:
#   eval "$(bash scripts/render-to-coolify/mint-smoke-firebase-token.sh)"
#   bash scripts/render-to-coolify/06-smoke-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

UID_SMOKE="${SMOKE_FIREBASE_UID:?Set SMOKE_FIREBASE_UID}"
API_KEY="${FIREBASE_WEB_API_KEY:-${VITE_FIREBASE_API_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  echo "Set FIREBASE_WEB_API_KEY or VITE_FIREBASE_API_KEY" >&2
  exit 1
fi

CUSTOM="$(pnpm --filter @workspace/api-server exec tsx -e "
import { adminAuth } from './src/lib/firebase-admin.js';
const t = await adminAuth().createCustomToken(process.env.SMOKE_FIREBASE_UID!);
console.log(t);
" 2>/dev/null | tail -1)"

ID_TOKEN="$(curl -sS "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}" \
  -H 'content-type: application/json' \
  -d "{\"token\":\"${CUSTOM}\",\"returnSecureToken\":true}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.idToken){console.error(j);process.exit(1)};console.log(j.idToken)})")"

echo "export SMOKE_FIREBASE_ID_TOKEN='${ID_TOKEN}'"
