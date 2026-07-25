#!/usr/bin/env bash
# Start ephemeris daemon (expects venv + local BSP already present).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
if [[ ! -f data/de440.bsp && ! -f data/de441.bsp ]]; then
  bash scripts/fetch-jpl-ephemeris.sh
fi
exec .venv/bin/python -m src.server
