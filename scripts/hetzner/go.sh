#!/usr/bin/env bash
# Interactive one-shot: load SSH key → preflight → deploy Hetzner AI worker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export HETZNER_HOST="${HETZNER_HOST:-167.233.39.146}"

echo "=== AmyNest Hetzner worker deploy ==="
echo "Server: ${HETZNER_HOST}"
echo ""

if [[ -z "${REDIS_URL_EXTERNAL:-}" && -f "$ROOT/hetzner-overrides.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/hetzner-overrides.env"
fi

if [[ -z "${REDIS_URL_EXTERNAL:-}" ]]; then
  echo "Set Render Redis external URL first."
  echo ""
  echo "  Render → amynest-redis-dykj → Networking → allow ${HETZNER_HOST}/32"
  echo "  Connect tab → External URL (rediss://...)"
  echo ""
  echo "Then either:"
  echo "  export REDIS_URL_EXTERNAL='rediss://...'"
  echo "  or create hetzner-overrides.env with REDIS_URL_EXTERNAL=..."
  exit 1
fi

if ! ssh-add -l 2>/dev/null | grep -qE 'ED25519|RSA'; then
  echo "Loading SSH key (enter passphrase if asked)…"
  eval "$(ssh-agent -s)" >/dev/null
  ssh-add --apple-use-keychain "${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
fi

bash "$ROOT/scripts/hetzner/preflight.sh"
bash "$ROOT/scripts/hetzner/deploy-worker.sh"
