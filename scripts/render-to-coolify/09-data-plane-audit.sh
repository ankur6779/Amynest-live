#!/usr/bin/env bash
# Data Plane Consistency Audit — collects live SSH probes then runs TypeScript audit.
# Exit 1 when deployment is NOT SAFE for canary.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUDIT_DIR="$ROOT/audit/render-to-coolify"
PROBE_JSON="$AUDIT_DIR/data-plane-probes.json"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"

mkdir -p "$AUDIT_DIR"

echo "==> Collecting Hetzner worker probes ($WORKER_HOST)"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=12 "root@$WORKER_HOST" \
  'cat /opt/amynest/worker.env 2>/dev/null | grep -E "^(DATABASE_URL|REDIS_URL|API_PUBLIC_URL|DEFAULT_OBJECT_STORAGE_BUCKET_ID|FIREBASE_PROJECT_ID|OPENAI_API_KEY|GCS_BUCKET_NAME|WORKER_ENABLED|AMYNEST_ENV)=" || true' \
  > "$AUDIT_DIR/worker.env.probe" || true

echo "==> Collecting Render Redis BullMQ stats (via worker container)"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  'docker exec amynest-worker node -e "const Redis=require(\"ioredis\");const r=new Redis(process.env.REDIS_URL,{lazyConnect:true});(async()=>{await r.connect();const o={};for(const q of [\"completed\",\"failed\",\"active\",\"wait\"]){const k=\"bull:ai-jobs:\"+q;const t=await r.type(k);if(t===\"list\")o[q]=await r.llen(k);else if(t===\"zset\")o[q]=await r.zcard(k);else if(t===\"stream\")o[q]=await r.xlen(k);else o[q]=0;}console.log(JSON.stringify(o));await r.quit();})().catch(e=>{console.log(JSON.stringify({error:e.message}));});"' \
  > "$AUDIT_DIR/render-redis.probe" 2>/dev/null || echo '{}' > "$AUDIT_DIR/render-redis.probe"

echo "==> Collecting Coolify backend probes ($COOLIFY_HOST)"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  'CID=$(docker ps --format "{{.Names}}" | grep -m1 ik6ml2uh || true); if [ -n "$CID" ]; then docker exec "$CID" printenv | grep -E "^(DATABASE_URL|REDIS_URL|API_PUBLIC_URL|FIREBASE_PROJECT_ID|DEFAULT_OBJECT_STORAGE_BUCKET_ID|NOTIFICATIONS_ENABLED|BACKGROUND_TASKS_ENABLED|SCHEDULER_ACTIVE_PLANE)="; fi' \
  > "$AUDIT_DIR/coolify-backend.env.probe" 2>/dev/null || true

echo "==> Collecting Coolify Redis + DB row count"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  'REDIS_PASS=$(python3 -c "import re; print(re.search(r\"REDIS_PASSWORD=(\\S+)\", open(\"/data/coolify/databases/g7jotufnm43n4au4e8n6x946/docker-compose.yml\").read()).group(1))" 2>/dev/null || echo ""); if [ -n "$REDIS_PASS" ]; then docker exec g7jotufnm43n4au4e8n6x946 redis-cli -a "$REDIS_PASS" --no-auth-warning KEYS "bull:*" 2>/dev/null | wc -l | tr -d " "; fi' \
  > "$AUDIT_DIR/coolify-redis-keys.probe" 2>/dev/null || echo "0" > "$AUDIT_DIR/coolify-redis-keys.probe"

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  'docker exec tcl9udyxcuq2zu598ebj0pfu psql -U postgres -d postgres -t -A -c "SELECT COALESCE(SUM(n_live_tup),0) FROM pg_stat_user_tables;" 2>/dev/null || echo ""' \
  > "$AUDIT_DIR/coolify-db-rows.probe" 2>/dev/null || true

python3 "$ROOT/scripts/render-to-coolify/collect-data-plane-probes.py" \
  --worker-env "$AUDIT_DIR/worker.env.probe" \
  --coolify-env "$AUDIT_DIR/coolify-backend.env.probe" \
  --render-redis "$AUDIT_DIR/render-redis.probe" \
  --coolify-redis-keys "$AUDIT_DIR/coolify-redis-keys.probe" \
  --coolify-db-rows "$AUDIT_DIR/coolify-db-rows.probe" \
  --out "$PROBE_JSON"

export DATA_PLANE_PROBE_JSON="$PROBE_JSON"
cd "$ROOT"
pnpm run migrate:render-to-coolify:data-plane-audit
