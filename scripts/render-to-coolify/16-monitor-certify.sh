#!/usr/bin/env bash
# Run 60-minute monitor certification soak on Hetzner and fetch results.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
WORKER_HOST="${WORKER_SSH_HOST:-167.233.39.146}"
REMOTE_AUDIT="/opt/amynest/monitor-audit"

bash "$(dirname "$0")/15-deploy-hetzner-monitor.sh"

echo "==> Starting 60-minute certification soak on Hetzner"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
  'systemctl stop amynest-canary-monitor.service 2>/dev/null || true; rm -f /opt/amynest/monitor-audit/monitor-soak.log; systemctl start amynest-monitor-soak.service'

echo "==> Soak running — polling until complete (up to 65 min)"
for i in $(seq 1 130); do
  if ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
    'systemctl is-active amynest-monitor-soak.service' 2>/dev/null | grep -q inactive; then
    break
  fi
  sleep 30
done

echo "==> Fetching certification artifacts"
mkdir -p "$ROOT/audit/render-to-coolify"
rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "root@$WORKER_HOST:$REMOTE_AUDIT/render-to-coolify/" \
  "$ROOT/audit/render-to-coolify/" 2>/dev/null || true

rsync -az \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "root@$WORKER_HOST:$REMOTE_AUDIT/monitor-soak.log" \
  "$ROOT/audit/render-to-coolify/monitor-soak-hetzner.log" 2>/dev/null || true

if [[ -f "$ROOT/audit/render-to-coolify/monitor-certification.md" ]]; then
  grep -E '^MONITOR (CERTIFIED|FAILED)' "$ROOT/audit/render-to-coolify/monitor-certification.md" | tail -1 || true
  cat "$ROOT/audit/render-to-coolify/monitor-certification.md"
else
  echo "MONITOR FAILED"
  echo "Certification report not produced — check $ROOT/audit/render-to-coolify/monitor-soak-hetzner.log"
  exit 1
fi
