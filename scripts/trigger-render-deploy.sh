#!/usr/bin/env bash
# RETIRED — Render API standby is suspended. Live API is Coolify (www.amynest.in).
# Live static is Cloudflare Pages. Do not call this from CI.
#
# This script always exits 0 so any leftover manual callers fail soft.
set -euo pipefail

echo "[trigger-render-deploy] RETIRED — Render standby is not part of production."
echo "[trigger-render-deploy] Production API: Coolify (Git webhook). Static: Cloudflare Pages."
echo "[trigger-render-deploy] Ignoring request for commit '${1:-}'."
exit 0
