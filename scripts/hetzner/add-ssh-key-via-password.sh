#!/usr/bin/env bash
# One-time: install local SSH public key on Hetzner when server was created without a key.
# Requires root password from Hetzner welcome email.
#
# Usage:
#   bash scripts/hetzner/add-ssh-key-via-password.sh
set -euo pipefail

HETZNER_HOST="${HETZNER_HOST:-167.233.39.146}"
HETZNER_SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
PUB="${HETZNER_SSH_KEY}.pub"

if [[ ! -f "$PUB" ]]; then
  echo "Missing public key: $PUB" >&2
  exit 1
fi

if ssh -i "$HETZNER_SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 "root@${HETZNER_HOST}" "echo ok" >/dev/null 2>&1; then
  echo "SSH key already works for root@${HETZNER_HOST}"
  exit 0
fi

if ! command -v ssh-copy-id >/dev/null 2>&1; then
  echo "Install ssh-copy-id (openssh client)" >&2
  exit 1
fi

echo "You will be prompted for the root password from Hetzner email."
ssh-copy-id -i "$HETZNER_SSH_KEY" "root@${HETZNER_HOST}"
ssh -i "$HETZNER_SSH_KEY" "root@${HETZNER_HOST}" "echo SSH key installed OK"
