#!/usr/bin/env bash
# Stateful Plane Unification — prepare Coolify as single Postgres/Redis/BullMQ plane.
# Does NOT change Cloudflare, DNS, or canary. Render HTTP stays live.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUDIT_DIR="$ROOT/audit/render-to-coolify"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"

mkdir -p "$AUDIT_DIR"

echo "==> Step 1: Collect process probes"
bash "$ROOT/scripts/render-to-coolify/09-data-plane-audit.sh" || true

echo "==> Step 2: Ensure Coolify Postgres/Redis proxies for external worker"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "root@$COOLIFY_HOST" bash <<'REMOTE'
set -euo pipefail
apt-get install -y socat >/dev/null 2>&1 || true
PG_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' tcl9udyxcuq2zu598ebj0pfu)
REDIS_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' g7jotufnm43n4au4e8n6x946)
for unit in amynest-pg-proxy amynest-redis-proxy; do
  systemctl is-active --quiet "$unit" || systemctl enable --now "$unit" 2>/dev/null || true
done
ss -tlnp | grep -E ':5432|:6379' || true
REMOTE

echo "==> Step 3: Drain Render BullMQ (pre-switch)"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "root@$WORKER_HOST" \
  'docker exec amynest-worker node -e "const Redis=require(\"ioredis\");const r=new Redis(process.env.REDIS_URL,{lazyConnect:true});(async()=>{await r.connect();const o={};for(const q of [\"wait\",\"active\",\"delayed\"]){const k=\"bull:ai-jobs:\"+q;const t=await r.type(k);o[q]=t===\"list\"?await r.llen(k):t===\"zset\"?await r.zcard(k):0;}console.log(JSON.stringify(o));await r.quit();})();"' \
  | tee "$AUDIT_DIR/bullmq-drain-pre.json"

echo "==> Step 4: Point Hetzner worker at Coolify stateful (manual env on server)"
echo "    Update /opt/amynest/worker.env DATABASE_URL + REDIS_URL to 188.245.208.126:5432/6379"
echo "    Then: docker rm -f amynest-worker && docker run ... (see deploy-worker-remote.sh)"

echo "==> Step 5: Render API env — set DATABASE_URL + REDIS_URL to Coolify proxy host"
echo "    Render Dashboard → Amynest-backend-dykj → Environment"
echo "    Or Render MCP update_environment_variables on srv-d85k8jbtqb8s7382mjng"

echo "==> Step 6: Disable Render standby worker (WORKER_ENABLED=false on amynest-ai-worker-dykj)"

echo "==> Step 7: Verify scheduler singleton"
pnpm run migrate:render-to-coolify:verify-scheduler

echo "==> Done. Review audit/render-to-coolify/stateful-plane-audit.md"
