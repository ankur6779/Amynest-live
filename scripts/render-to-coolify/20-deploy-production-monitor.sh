#!/usr/bin/env bash
# Deploy permanent AmyNest production monitor to Hetzner (systemd, journald, logrotate).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"
MONITOR_DIR="/opt/amynest/monitor"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"

INTERNAL_HEALTH_SECRET="${INTERNAL_HEALTH_SECRET:-}"
if [[ -z "$INTERNAL_HEALTH_SECRET" ]]; then
  INTERNAL_HEALTH_SECRET="$(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
    "grep -m1 '^INTERNAL_HEALTH_SECRET=' /data/coolify/applications/ik6ml2uhw6op765lo14wn5m3/.env | cut -d= -f2-" 2>/dev/null || true)"
fi

echo "==> Sync monitor source to $WORKER_HOST"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  "mkdir -p '$MONITOR_DIR/src/render-to-coolify' '$MONITOR_DIR/history'"

rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "$ROOT/scripts/src/render-to-coolify/production-monitor.ts" \
  "$ROOT/scripts/src/render-to-coolify/hardened-probe.ts" \
  "root@$WORKER_HOST:$MONITOR_DIR/src/render-to-coolify/"

echo "==> Install Node.js + dependencies"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<'REMOTE'
set -euo pipefail
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g tsx@4.19.4 2>/dev/null || npm install -g tsx
cd /opt/amynest/monitor
if [[ ! -d node_modules/ioredis ]]; then
  npm init -y >/dev/null 2>&1 || true
  npm install ioredis@5.6.1 --save --silent 2>/dev/null || npm install ioredis@5.6.1 --save
fi
REMOTE

echo "==> Configure environment, systemd, logrotate"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<REMOTE
set -euo pipefail
cat > /opt/amynest/monitor.env <<EOF
AMYNEST_MONITOR_DIR=/opt/amynest/monitor
PRODUCTION_URL=https://www.amynest.in
COOLIFY_API_URL=https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io
RENDER_API_URL=https://amynest-backend-dykj.onrender.com
MONITOR_INTERVAL_MS=60000
INTERNAL_HEALTH_SECRET=${INTERNAL_HEALTH_SECRET}
NODE_PATH=/opt/amynest/monitor/node_modules
EOF
chmod 600 /opt/amynest/monitor.env

cat > /etc/systemd/system/amynest-production-monitor.service <<'UNIT'
[Unit]
Description=AmyNest permanent production monitor (60s probes)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/opt/amynest/monitor.env
WorkingDirectory=/opt/amynest/monitor
ExecStart=/usr/bin/tsx ./src/render-to-coolify/production-monitor.ts
Restart=always
RestartSec=10
StartLimitIntervalSec=0
StandardOutput=journal
StandardError=journal
SyslogIdentifier=amynest-production-monitor

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/logrotate.d/amynest-production-monitor <<'ROTATE'
/opt/amynest/monitor/cycles.jsonl
/opt/amynest/monitor/history/*.jsonl {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
ROTATE

cat > /etc/cron.weekly/amynest-docker-prune <<'CRON'
#!/bin/sh
docker system prune -af --filter "until=168h" >/var/log/amynest-docker-prune.log 2>&1
CRON
chmod +x /etc/cron.weekly/amynest-docker-prune

systemctl daemon-reload
systemctl stop amynest-production-48h.service 2>/dev/null || true
systemctl disable amynest-production-48h.service 2>/dev/null || true
systemctl enable amynest-production-monitor.service
systemctl restart amynest-production-monitor.service
sleep 8
systemctl status amynest-production-monitor.service --no-pager
REMOTE

echo "==> Verify latest-status.json"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  "test -f /opt/amynest/monitor/latest-status.json && head -20 /opt/amynest/monitor/latest-status.json"

echo "DEPLOYED"
