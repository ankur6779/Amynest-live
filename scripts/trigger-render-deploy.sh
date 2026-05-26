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
SERVICES=(
  "srv-d85k80jtqb8s7382m7i0" # Amynest-live-1 (static web)
  "srv-d85k8jbtqb8s7382mjng" # Amynest-backend (API)
  "srv-d85k8jbtqb8s7382mjog" # amynest-ai-worker
)

for service_id in "${SERVICES[@]}"; do
  body='{}'
  if [[ -n "$COMMIT_ID" ]]; then
    body=$(printf '{"commitId":"%s"}' "$COMMIT_ID")
  fi

  echo "Triggering deploy for ${service_id}…"
  curl -sf -X POST "https://api.render.com/v1/services/${service_id}/deploys" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$body"
  echo
done

echo "All deploy requests queued."
