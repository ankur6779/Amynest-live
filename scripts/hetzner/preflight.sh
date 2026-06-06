#!/usr/bin/env bash
# Preflight checks before Hetzner worker deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HETZNER_HOST="${HETZNER_HOST:-167.233.39.146}"
HETZNER_SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
SOURCE="${AMYNEST_RENDER_ENV:-$ROOT/Amynest-backend-dykj.env}"

ok=true

check() {
  if "$@"; then
    echo "  OK  $*"
  else
    echo "  FAIL $*"
    ok=false
  fi
}

echo "[preflight] Hetzner worker deploy"
echo ""

echo "Files:"
check test -f "$SOURCE"
check test -f "${HETZNER_SSH_KEY}"
check test -f "${HETZNER_SSH_KEY}.pub"

echo ""
echo "SSH (${HETZNER_HOST}):"
if ssh-add -l 2>/dev/null | grep -q "${HETZNER_SSH_KEY}\|ED25519"; then
  echo "  OK  ssh-agent has a key loaded"
elif ssh -i "$HETZNER_SSH_KEY" -o BatchMode=yes -o ConnectTimeout=6 "root@${HETZNER_HOST}" "echo ok" >/dev/null 2>&1; then
  echo "  OK  direct key auth (no passphrase)"
else
  echo "  FAIL SSH — run: ssh-add --apple-use-keychain ${HETZNER_SSH_KEY}"
  ok=false
fi

echo ""
echo "Render Redis external URL:"
if [[ -n "${REDIS_URL_EXTERNAL:-}" ]]; then
  if [[ "${REDIS_URL_EXTERNAL}" == rediss://* ]]; then
    echo "  OK  REDIS_URL_EXTERNAL set (rediss://)"
  else
    echo "  FAIL REDIS_URL_EXTERNAL should use rediss:// for Render external"
    ok=false
  fi
else
  echo "  FAIL REDIS_URL_EXTERNAL not set"
  echo "       Render → amynest-redis-dykj → allow ${HETZNER_HOST}/32 → Connect → External URL"
  ok=false
fi

echo ""
if [[ "$ok" == true ]]; then
  echo "All checks passed. Run: bash scripts/hetzner/deploy-worker.sh"
  exit 0
fi
echo "Fix failures above, then re-run preflight."
exit 1
