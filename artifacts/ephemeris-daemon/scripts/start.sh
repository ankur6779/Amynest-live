#!/usr/bin/env bash
# Start ephemeris daemon (expects venv + local BSP already present).
# Production/Docker: never download kernels at runtime (would block Coolify forever).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGE_T0=$(date +%s)
echo "[ephemeris] START: daemon-start"
stage_end() {
  local code="${1:-$?}"
  echo "[ephemeris] END: daemon-start duration=$(( $(date +%s) - STAGE_T0 ))s exit=${code}"
}
trap 'stage_end $?' EXIT

if [[ ! -d .venv ]]; then
  if [[ "${ALLOW_RUNTIME_EPHEMERIS_SETUP:-0}" != "1" ]]; then
    echo "[ephemeris] FATAL: .venv missing. Bake venv at image build time." >&2
    exit 1
  fi
  echo "[ephemeris] creating venv (ALLOW_RUNTIME_EPHEMERIS_SETUP=1)"
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

if [[ ! -f data/de440.bsp && ! -f data/de441.bsp ]]; then
  if [[ "${ALLOW_RUNTIME_EPHEMERIS_FETCH:-0}" != "1" ]]; then
    echo "[ephemeris] FATAL: no DE440/DE441 BSP in data/." >&2
    echo "[ephemeris] Kernels must be fetched during Docker build (see docker/backend/Dockerfile)." >&2
    echo "[ephemeris] Refusing runtime download (set ALLOW_RUNTIME_EPHEMERIS_FETCH=1 only for local dev)." >&2
    exit 1
  fi
  echo "[ephemeris] WARN: runtime kernel fetch enabled (dev only)"
  bash scripts/fetch-jpl-ephemeris.sh
fi

# Clear EXIT trap before exec so we don't log a false "end" after replace
trap - EXIT
echo "[ephemeris] END: daemon-start duration=$(( $(date +%s) - STAGE_T0 ))s exit=0"
exec .venv/bin/python -m src.server
