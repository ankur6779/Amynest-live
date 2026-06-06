#!/usr/bin/env bash
# Trigger Render deploys for AmyNest production services (main branch).
# Requires RENDER_API_KEY (Account Settings → API Keys on render.com).
set -euo pipefail

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "RENDER_API_KEY is not set — cannot trigger deploys."
  exit 1
fi

COMMIT_ID="${1:-}"

# Production service IDs (Render Dashboard → service → Settings).
# AI worker runs on Hetzner (see docs/hetzner-ai-worker.md), not Render.
SERVICES=(
  "srv-d85k80jtqb8s7382m7i0" # Amynest-live-1 (static web)
  "srv-d85k8jbtqb8s7382mjng" # Amynest-backend (API)
)

failed=0

for service_id in "${SERVICES[@]}"; do
  body='{}'
  if [[ -n "$COMMIT_ID" ]]; then
    body=$(printf '{"commitId":"%s"}' "$COMMIT_ID")
  fi

  echo "Triggering deploy for ${service_id}…"
  response_file="$(mktemp)"
  http_code="$(
    curl -sS -o "$response_file" -w "%{http_code}" \
      -X POST "https://api.render.com/v1/services/${service_id}/deploys" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$body"
  )"

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "ERROR: Render deploy request failed for ${service_id} (HTTP ${http_code})"
    cat "$response_file"
    echo
    failed=1
  else
    echo "OK (${http_code}): $(cat "$response_file")"
  fi
  rm -f "$response_file"
done

if [[ "$failed" -ne 0 ]]; then
  echo "One or more Render deploy requests failed."
  exit 1
fi

echo "All deploy requests queued."
