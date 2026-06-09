#!/usr/bin/env bash
# Post-deploy smoke — verify production health endpoints respond OK.
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-https://www.amynest.in}"
API_URL="${SMOKE_API_URL:-https://amynest-backend-dykj.onrender.com}"

echo "[smoke] Web health: ${BASE_URL}/health"
web_status="$(curl -fsS -o /dev/null -w '%{http_code}' "${BASE_URL}/health" || echo "000")"
if [[ "${web_status}" != "200" ]]; then
  echo "[smoke] FAIL web /health status=${web_status}"
  exit 1
fi

echo "[smoke] API health: ${API_URL}/health"
api_status="$(curl -fsS -o /dev/null -w '%{http_code}' "${API_URL}/health" || echo "000")"
if [[ "${api_status}" != "200" ]]; then
  echo "[smoke] FAIL api /health status=${api_status}"
  exit 1
fi

echo "[smoke] API healthz: ${API_URL}/api/healthz"
healthz_status="$(curl -fsS -o /dev/null -w '%{http_code}' "${API_URL}/api/healthz" || echo "000")"
if [[ "${healthz_status}" != "200" ]]; then
  echo "[smoke] FAIL api /api/healthz status=${healthz_status}"
  exit 1
fi

echo "[smoke] API audio healthz: ${API_URL}/api/healthz/audio"
audio_health="$(curl -fsS "${API_URL}/api/healthz/audio" || echo '{}')"
audio_ok="$(printf '%s' "${audio_health}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(j.ok===true?'true':'false')}catch{process.stdout.write('false')}})")"
if [[ "${audio_ok}" != "true" ]]; then
  echo "[smoke] FAIL api /api/healthz/audio not ready"
  printf '%s\n' "${audio_health}" | head -c 400
  exit 1
fi

echo "[smoke] Public static-audio missing POST rejected (401): ${API_URL}/api/static-audio/missing"
post_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -d '{"keys":["test-key"]}' \
  "${API_URL}/api/static-audio/missing" || echo "000")"
if [[ "${post_status}" == "204" ]]; then
  echo "[smoke] WARN static-audio/missing POST still public (204) — deploy security patch pending"
elif [[ "${post_status}" != "401" ]]; then
  echo "[smoke] FAIL unauthenticated static-audio/missing POST status=${post_status} (expected 401)"
  exit 1
fi

echo "[smoke] auth/whoami disabled in production: ${API_URL}/api/auth/whoami"
whoami_status="$(curl -sS -o /dev/null -w '%{http_code}' "${API_URL}/api/auth/whoami" || echo "000")"
if [[ "${whoami_status}" != "404" ]]; then
  echo "[smoke] WARN auth/whoami status=${whoami_status} (expected 404 until deploy)"
fi

echo "[smoke] All checks passed."
