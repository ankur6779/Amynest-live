#!/usr/bin/env bash
# Deploy AmyNest AI worker to Hetzner (Redis stays on Render).
#
# Prereqs:
#   1. SSH key access: ssh -i ~/.ssh/id_ed25519_hetzner root@HETZNER_HOST
#   2. Render Redis external URL (rediss://…) after adding Hetzner IP to allowlist
#   3. Amynest-backend-dykj.env at repo root (gitignored)
#
# Usage:
#   export HETZNER_HOST=167.233.39.146
#   export REDIS_URL_EXTERNAL='rediss://red-...:PASSWORD@...redis.render.com:6379'
#   bash scripts/hetzner/deploy-worker.sh
#
# Optional:
#   HETZNER_SSH_KEY=~/.ssh/id_ed25519_hetzner
#   DATABASE_URL_EXTERNAL=...  (auto-derived from internal if omitted)
#   SKIP_RENDER_WORKER_SUSPEND=1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HETZNER_HOST="${HETZNER_HOST:-167.233.39.146}"
HETZNER_SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
SSH_USER="${HETZNER_SSH_USER:-root}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if ssh-add -l 2>/dev/null | grep -qE 'ED25519|RSA'; then
  : # use ssh-agent identity (passphrase-protected keys)
else
  SSH_OPTS+=(-i "$HETZNER_SSH_KEY" -o BatchMode=yes)
fi
REMOTE_DIR=/opt/amynest
REPO_URL="${AMYNEST_REPO_URL:-https://github.com/ankur6779/Amynest-live.git}"
REPO_BRANCH="${AMYNEST_REPO_BRANCH:-main}"

ssh_cmd() { ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HETZNER_HOST}" "$@"; }
scp_cmd() { scp "${SSH_OPTS[@]}" "$@"; }

echo "[deploy] target ${SSH_USER}@${HETZNER_HOST}"

if ! ssh_cmd "echo ok" >/dev/null 2>&1; then
  echo "SSH failed. Add your public key to the server:" >&2
  echo "  cat ${HETZNER_SSH_KEY}.pub" >&2
  echo "Hetzner Console → server → Rescue/Console, or rebuild with SSH key." >&2
  exit 1
fi

echo "[deploy] bootstrap server…"
scp_cmd "$ROOT/scripts/hetzner/remote-setup.sh" "${SSH_USER}@${HETZNER_HOST}:/tmp/remote-setup.sh"
ssh_cmd "bash /tmp/remote-setup.sh"

echo "[deploy] build worker.env…"
(
  export REDIS_URL_EXTERNAL="${REDIS_URL_EXTERNAL:-}"
  export DATABASE_URL_EXTERNAL="${DATABASE_URL_EXTERNAL:-}"
  bash "$ROOT/scripts/hetzner/build-worker-env.sh" --out "$ROOT/.hetzner-worker.env"
)

scp_cmd "$ROOT/.hetzner-worker.env" "${SSH_USER}@${HETZNER_HOST}:${REMOTE_DIR}/worker.env"
ssh_cmd "chmod 600 ${REMOTE_DIR}/worker.env"

echo "[deploy] clone/pull repo and build image…"
ssh_cmd bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
if [[ -d Amynest-live/.git ]]; then
  git -C Amynest-live fetch origin ${REPO_BRANCH}
  git -C Amynest-live checkout ${REPO_BRANCH}
  git -C Amynest-live pull --ff-only origin ${REPO_BRANCH}
else
  git clone --branch ${REPO_BRANCH} --depth 1 ${REPO_URL} Amynest-live
fi
cd Amynest-live
docker build -f docker/worker/Dockerfile -t amynest-worker:latest .
docker rm -f amynest-worker 2>/dev/null || true
docker run -d \
  --name amynest-worker \
  --restart unless-stopped \
  --env-file ${REMOTE_DIR}/worker.env \
  -p 127.0.0.1:9090:9090 \
  amynest-worker:latest
REMOTE

echo "[deploy] waiting for worker health…"
for i in $(seq 1 30); do
  if ssh_cmd "curl -sf http://127.0.0.1:9090/health >/dev/null"; then
    echo "[deploy] worker health OK"
    break
  fi
  sleep 2
  if [[ "$i" -eq 30 ]]; then
    echo "[deploy] health check timed out — logs:" >&2
    ssh_cmd "docker logs amynest-worker 2>&1 | tail -40" >&2 || true
    exit 1
  fi
done

ssh_cmd "docker logs amynest-worker 2>&1 | tail -20"

if [[ "${SKIP_RENDER_WORKER_SUSPEND:-}" != "1" ]]; then
  echo "[deploy] Render worker still running — set SKIP_RENDER_WORKER_SUSPEND=1 to skip suspend reminder."
  echo "After verifying jobs on Hetzner, suspend amynest-ai-worker-dykj in Render Dashboard."
fi

echo "[deploy] done."
