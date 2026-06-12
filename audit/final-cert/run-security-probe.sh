#!/bin/bash
set -euo pipefail
OUT="/Users/macbook/AmyNestProject/AmyNest-AI/audit/final-cert/security-probe.txt"
BASE="https://www.amynest.in"
echo "Security probe $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT"
paths=(
  "/api/admin/dashboard"
  "/api/admin/users"
  "/api/admin/feedback"
  "/api/admin/audio-health"
  "/api/admin/infant-parenting"
  "/api/debug/health"
  "/api/dev/phonics"
  "/debug/learning"
  "/debug-parity"
  "/dev/phonics-audio-preview"
  "/dev/rhymes-audio-ab"
  "/api/health"
  "/api/healthz"
  "/admin/dashboard"
  "/admin/feedback"
  "/admin/audio-health"
)
for path in "${paths[@]}"; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${BASE}${path}")
  loc=$(/usr/bin/curl -s -I --max-time 15 "${BASE}${path}" 2>/dev/null | /usr/bin/grep -i "^location:" | /usr/bin/head -1 | /usr/bin/tr -d '\r' || true)
  echo "${path} -> HTTP ${code} ${loc}" | tee -a "$OUT"
done
