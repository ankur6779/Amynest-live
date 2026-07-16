#!/usr/bin/env bash
# Apply pre-cutover scheduler env on Coolify production and redeploy.
set -euo pipefail

SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"
APP_DIR="/data/coolify/applications/ik6ml2uhw6op765lo14wn5m3"

echo "==> Backup and patch Coolify .env"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" bash <<'REMOTE'
set -euo pipefail
APP_DIR="/data/coolify/applications/ik6ml2uhw6op765lo14wn5m3"
cp "$APP_DIR/.env" "$APP_DIR/.env.bak.$(date +%Y%m%d-%H%M%S)"
python3 <<'PY'
from pathlib import Path
import re
path = Path("/data/coolify/applications/ik6ml2uhw6op765lo14wn5m3/.env")
text = path.read_text()
updates = {
    "SCHEDULER_ACTIVE_PLANE": "render",
    "BACKGROUND_TASKS_ENABLED": "false",
    "NOTIFICATIONS_ENABLED": "false",
}
for key, val in updates.items():
    if re.search(rf"^{re.escape(key)}=", text, re.M):
        text = re.sub(rf"^{re.escape(key)}=.*$", f"{key}={val}", text, flags=re.M)
    else:
        text = text.rstrip() + f"\n{key}={val}\n"
path.write_text(text)
for k, v in updates.items():
    print(f"{k}={v}")
PY
REMOTE

echo "==> Ensure Traefik HTTPS labels before redeploy"
bash "$(dirname "$0")/19-ensure-coolify-traefik-https.sh"

echo "==> Redeploy Coolify container (force-recreate)"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  "cd $APP_DIR && docker compose up -d --force-recreate"

echo "==> Wait for container start"
sleep 12

echo "==> Container env check"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  'docker exec ik6ml2uhw6op765lo14wn5m3-163450859569 printenv SCHEDULER_ACTIVE_PLANE BACKGROUND_TASKS_ENABLED NOTIFICATIONS_ENABLED | sort'

echo "==> Boot log scheduler signals"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  'docker logs ik6ml2uhw6op765lo14wn5m3-163450859569 2>&1 | tail -40 | grep -E "background\.skipped|notification cron disabled|scheduler|BACKGROUND_TASKS|crons" || docker logs ik6ml2uhw6op765lo14wn5m3-163450859569 2>&1 | tail -8'
