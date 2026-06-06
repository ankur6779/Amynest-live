#!/usr/bin/env bash
# One-time Hetzner server bootstrap: Docker + firewall. Run as root on the CX33.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "[hetzner] apt update/upgrade…"
apt-get update -qq
apt-get upgrade -y -qq

if ! command -v ufw >/dev/null 2>&1; then
  apt-get install -y -qq ufw
fi

echo "[hetzner] firewall (SSH only)…"
ufw allow OpenSSH
ufw --force enable

if command -v docker >/dev/null 2>&1; then
  echo "[hetzner] Docker already installed: $(docker --version)"
else
  echo "[hetzner] installing Docker…"
  apt-get install -y -qq ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

mkdir -p /opt/amynest
echo "[hetzner] bootstrap complete."
