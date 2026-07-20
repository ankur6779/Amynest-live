#!/usr/bin/env bash
# Start Stage 50 autonomous 90-minute certification monitor on Hetzner (detached systemd).
# Safe to disconnect laptop immediately after this script exits.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"
REMOTE_DIR="/opt/amynest/monitor"
REMOTE_AUDIT="/opt/amynest/monitor-audit"
REMOTE_CF="/opt/amynest/cloudflare-proxy"
COOLIFY_URL="${COOLIFY_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"
RENDER_URL="${RENDER_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"

# Optional secrets from local shell (never printed)
INTERNAL_HEALTH_SECRET="${INTERNAL_HEALTH_SECRET:-}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [[ -z "$INTERNAL_HEALTH_SECRET" && -f "$ROOT/.env.development" ]]; then
  INTERNAL_HEALTH_SECRET="$(grep -m1 '^INTERNAL_HEALTH_SECRET=' "$ROOT/.env.development" 2>/dev/null | cut -d= -f2- || true)"
fi

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  "mkdir -p '$REMOTE_DIR/src/render-to-coolify' '$REMOTE_AUDIT/render-to-coolify' '$REMOTE_CF'"

rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "$ROOT/scripts/src/render-to-coolify/" \
  "root@$WORKER_HOST:$REMOTE_DIR/src/render-to-coolify/"

rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "$ROOT/infra/cloudflare/amynest-api-proxy/" \
  "root@$WORKER_HOST:$REMOTE_CF/"

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<REMOTE
set -euo pipefail
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g tsx@4.19.4 2>/dev/null || npm install -g tsx
cd /opt/amynest/monitor
if [[ ! -d node_modules/pg ]]; then
  npm init -y >/dev/null 2>&1 || true
  npm install pg@8.20.0 ioredis@5.6.1 --save --silent 2>/dev/null || npm install pg@8.20.0 ioredis@5.6.1 --save
fi
cd /opt/amynest/cloudflare-proxy
npm init -y >/dev/null 2>&1 || true
npm install wrangler@4.95.0 --save-dev --silent 2>/dev/null || npm install wrangler@4.95.0 --save-dev
REMOTE

# Write monitor.env on remote (secrets via stdin heredoc)
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<REMOTE
cat > /opt/amynest/monitor.env <<EOF
COOLIFY_API_URL=$COOLIFY_URL
RENDER_API_URL=$RENDER_URL
COOLIFY_SSH_HOST=$COOLIFY_HOST
MONITOR_INTERVAL_MS=30000
STAGE50_MONITOR_DURATION_MS=5400000
AMYNEST_AUDIT_DIR=$REMOTE_AUDIT
NODE_PATH=/opt/amynest/monitor/node_modules
CLOUDFLARE_PROXY_DIR=$REMOTE_CF
INTERNAL_HEALTH_SECRET=${INTERNAL_HEALTH_SECRET}
CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
EOF
chmod 600 /opt/amynest/monitor.env

cat > /etc/systemd/system/amynest-stage50-autonomous.service <<'UNIT'
[Unit]
Description=AmyNest Stage 50 autonomous certification monitor (90 min)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/opt/amynest/monitor.env
WorkingDirectory=/opt/amynest/monitor
ExecStart=/usr/bin/env bash -lc 'tsx ./src/render-to-coolify/stage-50-autonomous-monitor.ts'
StandardOutput=append:/opt/amynest/monitor-audit/stage50-autonomous.log
StandardError=append:/opt/amynest/monitor-audit/stage50-autonomous.log
TimeoutStartSec=6000

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl stop amynest-stage50-autonomous.service 2>/dev/null || true
systemctl reset-failed amynest-stage50-autonomous.service 2>/dev/null || true
systemctl start amynest-stage50-autonomous.service
REMOTE
