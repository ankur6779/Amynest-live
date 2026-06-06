#!/usr/bin/env bash
# Enable Hetzner IP on Render Key Value and print external Redis URL (needs RENDER_API_KEY).
#
# Usage:
#   export RENDER_API_KEY=rnd_...
#   export HETZNER_HOST=167.233.39.146
#   bash scripts/hetzner/render-redis-external.sh
set -euo pipefail

REDIS_ID="${RENDER_REDIS_ID:-red-d85k80btqb8s7382m7gg}"
HETZNER_HOST="${HETZNER_HOST:-167.233.39.146}"
API_KEY="${RENDER_API_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "Set RENDER_API_KEY (Render Dashboard → Account → API Keys)" >&2
  echo "" >&2
  echo "Manual steps:" >&2
  echo "  1. Render → amynest-redis-dykj → Networking → allow ${HETZNER_HOST}/32" >&2
  echo "  2. Connect tab → copy External Redis URL (rediss://…)" >&2
  echo "  3. export REDIS_URL_EXTERNAL='rediss://...'" >&2
  exit 1
fi

payload=$(python3 - <<PY
import json
print(json.dumps({
  "ipAllowList": [
    {"cidrBlock": "${HETZNER_HOST}/32", "description": "Hetzner AI worker"}
  ]
}))
PY
)

echo "[render] updating Redis IP allowlist for ${HETZNER_HOST}…"
http_code=$(curl -sS -o /tmp/render-redis-update.json -w "%{http_code}" \
  -X PATCH "https://api.render.com/v1/key-value/${REDIS_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$http_code" != "200" && "$http_code" != "202" ]]; then
  echo "Render API PATCH failed HTTP ${http_code}:" >&2
  cat /tmp/render-redis-update.json >&2
  exit 1
fi

echo "[render] fetching connection info…"
curl -sS "https://api.render.com/v1/key-value/${REDIS_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Accept: application/json" \
  | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
conn = data.get("connectionInfo") or data.get("connection_info") or {}
ext = conn.get("externalConnectionString") or conn.get("external_connection_string")
if ext:
    print("REDIS_URL_EXTERNAL=" + ext)
else:
    print("External URL not in API response — copy from Render Dashboard → Connect", file=sys.stderr)
    print(json.dumps(data, indent=2)[:2000], file=sys.stderr)
    sys.exit(1)
PY
