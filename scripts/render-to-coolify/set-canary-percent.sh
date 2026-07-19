#!/usr/bin/env bash
# Advance Cloudflare canary percent (Render stays primary until 100%).
#
#   bash scripts/render-to-coolify/set-canary-percent.sh 1
#   bash scripts/render-to-coolify/set-canary-percent.sh 10
#
# Then deploy worker:
#   cd infra/cloudflare/amynest-api-proxy && wrangler deploy
set -euo pipefail

PCT="${1:-}"
if [[ -z "$PCT" ]]; then
  echo "Usage: $0 <percent>   # 0, 1, 10, 25, 50, 100"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ "$PCT" != "0" ]]; then
  echo "==> Data plane consistency gate (required before canary > 0%)"
  if ! bash "$ROOT/scripts/render-to-coolify/09-data-plane-audit.sh"; then
    echo ""
    echo "BLOCKED: Data plane audit failed. See audit/render-to-coolify/data-plane-audit-latest.md"
    exit 1
  fi
  echo ""
fi

WRANGLER="$ROOT/infra/cloudflare/amynest-api-proxy/wrangler.toml"

if [[ ! -f "$WRANGLER" ]]; then
  echo "Missing $WRANGLER"
  exit 1
fi

python3 - <<PY
import re, pathlib
pct = "$PCT"
path = pathlib.Path("$WRANGLER")
text = path.read_text()
if not re.search(r'^CANARY_PERCENT\s*=', text, re.M):
    print("CANARY_PERCENT not found in wrangler.toml")
    raise SystemExit(1)
text = re.sub(r'^CANARY_PERCENT\s*=\s*".*"', f'CANARY_PERCENT = "{pct}"', text, count=1, flags=re.M)
path.write_text(text)
print(f"Set CANARY_PERCENT={pct} in wrangler.toml")
PY

echo ""
echo "Set CANARY_BACKEND_ORIGIN in wrangler.toml if not already configured."
echo "Deploy: cd infra/cloudflare/amynest-api-proxy && wrangler deploy"
echo "Monitor: bash scripts/render-to-coolify/07-canary-monitor.sh --watch --advance"
