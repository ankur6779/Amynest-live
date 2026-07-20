#!/usr/bin/env bash
# Start 48-hour autonomous production monitor on Hetzner (detached systemd).
# Safe to disconnect laptop immediately after this script exits.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"
REMOTE_DIR="/opt/amynest/monitor"
REMOTE_AUDIT="/opt/amynest/monitor-audit"
COOLIFY_URL="${COOLIFY_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"
RENDER_URL="${RENDER_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"

INTERNAL_HEALTH_SECRET="${INTERNAL_HEALTH_SECRET:-}"
if [[ -z "$INTERNAL_HEALTH_SECRET" && -f "$ROOT/.env.development" ]]; then
  INTERNAL_HEALTH_SECRET="$(grep -m1 '^INTERNAL_HEALTH_SECRET=' "$ROOT/.env.development" 2>/dev/null | cut -d= -f2- || true)"
fi

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  "mkdir -p '$REMOTE_DIR/src/render-to-coolify' '$REMOTE_AUDIT/render-to-coolify'"

rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "$ROOT/scripts/src/render-to-coolify/" \
  "root@$WORKER_HOST:$REMOTE_DIR/src/render-to-coolify/"

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
REMOTE

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<REMOTE
cat > /opt/amynest/monitor.env <<EOF
COOLIFY_API_URL=$COOLIFY_URL
RENDER_API_URL=$RENDER_URL
COOLIFY_SSH_HOST=$COOLIFY_HOST
MONITOR_INTERVAL_MS=60000
PRODUCTION_MONITOR_DURATION_MS=172800000
AMYNEST_AUDIT_DIR=$REMOTE_AUDIT
NODE_PATH=/opt/amynest/monitor/node_modules
INTERNAL_HEALTH_SECRET=${INTERNAL_HEALTH_SECRET}
EOF
chmod 600 /opt/amynest/monitor.env

cat > /etc/systemd/system/amynest-production-48h.service <<'UNIT'
[Unit]
Description=AmyNest production 48-hour autonomous monitor (60s probes)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/opt/amynest/monitor.env
WorkingDirectory=/opt/amynest/monitor
ExecStart=/usr/bin/env bash -lc 'tsx ./src/render-to-coolify/production-48h-monitor.ts'
StandardOutput=append:/opt/amynest/monitor-audit/production-48h.log
StandardError=append:/opt/amynest/monitor-audit/production-48h.log
TimeoutStartSec=180000

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl stop amynest-production-48h.service 2>/dev/null || true
systemctl reset-failed amynest-production-48h.service 2>/dev/null || true
systemctl start --no-block amynest-production-48h.service
REMOTE
