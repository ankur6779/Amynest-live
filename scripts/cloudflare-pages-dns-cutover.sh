#!/usr/bin/env bash
# Point www.amynest.in DNS to Cloudflare Pages (amynest-web).
# Requires CLOUDFLARE_API_TOKEN with Zone.DNS Edit on amynest.in.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=... bash scripts/cloudflare-pages-dns-cutover.sh
#
# Rollback: restore www CNAME/A record to Render origin (amynest-live-1-dykj.onrender.com).
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-amynest.in}"
RECORD_NAME="${RECORD_NAME:-www.amynest.in}"
PAGES_TARGET="${PAGES_TARGET:-amynest-web.pages.dev}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (Zone.DNS Edit on ${ZONE_NAME})." >&2
  exit 1
fi

auth_hdr=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

zone_id="$(curl -fsS "${auth_hdr[@]}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);process.stdout.write(j.result?.[0]?.id||'')})")"

if [[ -z "${zone_id}" ]]; then
  echo "Zone ${ZONE_NAME} not found." >&2
  exit 1
fi

records="$(curl -fsS "${auth_hdr[@]}" \
  "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?name=${RECORD_NAME}")"

record_id="$(printf '%s' "${records}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);const r=j.result?.[0];process.stdout.write(r?.id||'')})")"

payload="$(node -e "
const target = process.argv[1];
const name = process.argv[2];
console.log(JSON.stringify({
  type: 'CNAME',
  name,
  content: target,
  proxied: true,
  ttl: 1,
}));
" "${PAGES_TARGET}" "${RECORD_NAME}")"

if [[ -n "${record_id}" ]]; then
  echo "[dns] Updating ${RECORD_NAME} -> ${PAGES_TARGET}"
  curl -fsS -X PATCH "${auth_hdr[@]}" \
    -d "${payload}" \
    "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.success){console.error(JSON.stringify(j));process.exit(1)};console.log('[dns] OK', j.result?.content)})"
else
  echo "[dns] Creating ${RECORD_NAME} -> ${PAGES_TARGET}"
  curl -fsS -X POST "${auth_hdr[@]}" \
    -d "${payload}" \
    "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.success){console.error(JSON.stringify(j));process.exit(1)};console.log('[dns] OK', j.result?.content)})"
fi

echo "[dns] Verify: curl -I https://${RECORD_NAME}/ | grep -v rndr-id"
echo "[dns] Verify API: curl -I https://${RECORD_NAME}/api/healthz | grep x-amynest-backend"
