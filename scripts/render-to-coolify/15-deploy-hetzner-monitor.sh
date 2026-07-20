#!/usr/bin/env bash
# Deploy hardened canary monitor to Hetzner (always-on, survives laptop sleep).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"
REMOTE_DIR="/opt/amynest/monitor"
REMOTE_AUDIT="/opt/amynest/monitor-audit"

echo "==> Syncing monitor scripts to $WORKER_HOST"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  "mkdir -p '$REMOTE_DIR/src/render-to-coolify' '$REMOTE_AUDIT/render-to-coolify'"

rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "$ROOT/scripts/src/render-to-coolify/" \
  "root@$WORKER_HOST:$REMOTE_DIR/src/render-to-coolify/"

echo "==> Installing Node.js 22 + tsx if missing"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<'REMOTE'
set -euo pipefail
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g tsx@4.19.4 2>/dev/null || npm install -g tsx
cd /opt/amynest/monitor
if [[ ! -d node_modules/pg ]]; then
  npm init -y >/dev/null 2>&1 || true
  npm install pg@8.20.0 --save --silent 2>/dev/null || npm install pg@8.20.0 --save
fi
node -v
tsx --version
REMOTE

COOLIFY_URL="${COOLIFY_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"
RENDER_URL="${RENDER_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  "cat > /opt/amynest/monitor.env <<EOF
COOLIFY_API_URL=$COOLIFY_URL
RENDER_API_URL=$RENDER_URL
MONITOR_INTERVAL_MS=30000
MONITOR_SOAK_DURATION_MS=3600000
AMYNEST_AUDIT_DIR=$REMOTE_AUDIT
NODE_PATH=/opt/amynest/monitor/node_modules
EOF"

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" bash -s <<'REMOTE'
cat > /etc/systemd/system/amynest-monitor-soak.service <<'UNIT'
[Unit]
Description=AmyNest monitor certification soak (60 min)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/opt/amynest/monitor.env
WorkingDirectory=/opt/amynest/monitor
ExecStart=/usr/bin/env bash -lc 'tsx ./src/render-to-coolify/monitor-soak.ts'
StandardOutput=append:/opt/amynest/monitor-audit/monitor-soak.log
StandardError=append:/opt/amynest/monitor-audit/monitor-soak.log

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/amynest-canary-monitor.service <<'UNIT'
[Unit]
Description=AmyNest hardened canary monitor (watch loop)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/opt/amynest/monitor.env
WorkingDirectory=/opt/amynest/monitor
ExecStart=/usr/bin/env bash -lc 'tsx ./src/render-to-coolify/canary-monitor.ts -- --watch'
Restart=always
RestartSec=10
StandardOutput=append:/opt/amynest/monitor-audit/canary-monitor.log
StandardError=append:/opt/amynest/monitor-audit/canary-monitor.log

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
REMOTE

echo "Deployed monitor to $WORKER_HOST"
