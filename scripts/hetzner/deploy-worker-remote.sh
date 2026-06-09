#!/usr/bin/env bash
# Code-only redeploy of the Hetzner AI worker (worker.env already on server).
# Used by GitHub Actions after HETZNER_SSH_PRIVATE_KEY + HETZNER_HOST are configured.
set -euo pipefail

HETZNER_HOST="$(printf '%s' "${HETZNER_HOST:?HETZNER_HOST is required}" | tr -d '[:space:]')"
SSH_USER="${HETZNER_SSH_USER:-root}"
REMOTE_DIR=/opt/amynest
REPO_BRANCH="${AMYNEST_REPO_BRANCH:-main}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes)
if [[ -n "${HETZNER_SSH_KEY_FILE:-}" ]]; then
  SSH_OPTS+=(-i "$HETZNER_SSH_KEY_FILE")
elif [[ -n "${HETZNER_SSH_KEY:-}" ]]; then
  key_file="$(mktemp)"
  trap 'rm -f "$key_file"' EXIT
  printf '%s\n' "$HETZNER_SSH_KEY" >"$key_file"
  chmod 600 "$key_file"
  SSH_OPTS+=(-i "$key_file")
fi

ssh_cmd() { ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HETZNER_HOST}" "$@"; }

echo "[deploy-remote] target ${SSH_USER}@${HETZNER_HOST}"
echo "[deploy-remote] NOTE: code-only deploy — worker.env is NOT refreshed."
echo "[deploy-remote] After secret/env changes run: bash scripts/hetzner/deploy-worker.sh"

if ! ssh_cmd "echo ok" >/dev/null 2>&1; then
  echo "SSH failed — check HETZNER_SSH_PRIVATE_KEY and HETZNER_HOST secrets." >&2
  ssh "${SSH_OPTS[@]}" -o ConnectTimeout=15 "${SSH_USER}@${HETZNER_HOST}" true 2>&1 | tail -5 >&2 || true
  exit 1
fi

echo "[deploy-remote] pull latest ${REPO_BRANCH} and rebuild image…"
ssh_cmd bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}/Amynest-live
git fetch origin ${REPO_BRANCH}
git checkout ${REPO_BRANCH}
git pull --ff-only origin ${REPO_BRANCH}
docker build -f docker/worker/Dockerfile -t amynest-worker:latest .
docker rm -f amynest-worker 2>/dev/null || true
docker run -d \
  --name amynest-worker \
  --restart unless-stopped \
  --env-file ${REMOTE_DIR}/worker.env \
  -p 127.0.0.1:9090:9090 \
  amynest-worker:latest
REMOTE

echo "[deploy-remote] waiting for worker health…"
for i in $(seq 1 30); do
  if ssh_cmd "curl -sf http://127.0.0.1:9090/health >/dev/null"; then
    echo "[deploy-remote] worker health OK"
    ssh_cmd "docker logs amynest-worker 2>&1 | tail -15"
    echo "[deploy-remote] done."
    exit 0
  fi
  sleep 2
done

echo "[deploy-remote] health check timed out — logs:" >&2
ssh_cmd "docker logs amynest-worker 2>&1 | tail -40" >&2 || true
exit 1
