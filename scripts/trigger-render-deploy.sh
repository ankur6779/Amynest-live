#!/usr/bin/env bash
# DEPRECATED — Render API standby is suspended; live API is Coolify (www.amynest.in).
# Kept for emergency manual use only (workflow_dispatch deploy-render.yml).
# Exits 0 when the service is suspended so operators are not blocked by a retired standby.
set -euo pipefail

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "RENDER_API_KEY is not set — cannot trigger deploys."
  exit 1
fi

COMMIT_ID="${1:-}"

# Render API hot standby only — live API is Coolify; AI worker is Hetzner.
SERVICES=(
  "srv-d85k8jbtqb8s7382mjng" # Amynest-backend (API standby — suspended)
)

failed=0
suspended=0

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
    if grep -qi 'suspended' "$response_file"; then
      echo "WARN: Render service ${service_id} is suspended — standby deploy skipped (Coolify is production)."
      cat "$response_file"
      echo
      suspended=1
    else
      echo "ERROR: Render deploy request failed for ${service_id} (HTTP ${http_code})"
      cat "$response_file"
      echo
      failed=1
    fi
  else
    echo "OK (${http_code}): $(cat "$response_file")"
  fi
  rm -f "$response_file"
done

if [[ "$failed" -ne 0 ]]; then
  echo "One or more Render deploy requests failed."
  exit 1
fi

if [[ "$suspended" -ne 0 ]]; then
  echo "Render standby is suspended — no deploy queued (expected after Coolify cutover)."
  exit 0
fi

echo "All deploy requests queued."
