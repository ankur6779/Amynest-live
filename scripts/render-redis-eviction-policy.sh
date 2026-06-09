#!/usr/bin/env bash
# Set Render Key Value maxmemory policy (BullMQ needs noeviction).
#
# Usage:
#   export RENDER_API_KEY=rnd_...
#   bash scripts/render-redis-eviction-policy.sh
#   bash scripts/render-redis-eviction-policy.sh noeviction   # default
#   bash scripts/render-redis-eviction-policy.sh allkeys-lru  # cache-only use
set -euo pipefail

REDIS_ID="${RENDER_REDIS_ID:-red-d85k80btqb8s7382m7gg}"
POLICY="${1:-noeviction}"
API_KEY="${RENDER_API_KEY:-}"

case "$POLICY" in
  noeviction | allkeys_lru | allkeys_lfu | allkeys_random | volatile_lru | volatile_lfu | volatile_random | volatile_ttl) ;;
  *)
    echo "Unsupported maxmemory policy: ${POLICY}" >&2
    exit 1
    ;;
esac

if [[ -z "$API_KEY" ]]; then
  echo "Set RENDER_API_KEY (Render Dashboard → Account → API Keys)" >&2
  echo "" >&2
  echo "Manual: Render → amynest-redis-dykj → Settings → Maxmemory Policy → ${POLICY}" >&2
  exit 1
fi

payload=$(python3 - <<PY
import json
print(json.dumps({"maxmemoryPolicy": "${POLICY}"}))
PY
)

echo "[render] setting amynest-redis maxmemoryPolicy=${POLICY}…"
http_code=$(curl -sS -o /tmp/render-redis-policy.json -w "%{http_code}" \
  -X PATCH "https://api.render.com/v1/key-value/${REDIS_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$http_code" != "200" && "$http_code" != "202" ]]; then
  echo "Render API PATCH failed HTTP ${http_code}:" >&2
  cat /tmp/render-redis-policy.json >&2
  exit 1
fi

echo "[render] verifying…"
verify_json=$(curl -sS "https://api.render.com/v1/key-value/${REDIS_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Accept: application/json")
printf '%s' "$verify_json" | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
opts = data.get("options") or {}
policy = opts.get("maxmemoryPolicy") or opts.get("maxmemory_policy")
name = data.get("name", data.get("id", "?"))
print(f"[render] {name} maxmemoryPolicy={policy}")
if policy != "noeviction":
    print("WARN: expected noeviction for BullMQ — check Dashboard if API did not apply", file=sys.stderr)
PY

echo "[render] done."
