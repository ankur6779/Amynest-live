#!/usr/bin/env bash
# Ensure Coolify Traefik HTTPS labels survive redeploys.
#
# Coolify stores Traefik labels in applications.custom_labels (base64). On each
# native deploy, ApplicationDeploymentJob reads that field instead of regenerating
# from FQDN when custom_labels is set. If labels were first generated with an
# http:// FQDN, only HTTP routers are stored and HTTPS returns 503 after redeploy.
#
# This script:
#   1. Forces applications.fqdn to https:// (if currently http://)
#   2. Regenerates custom_labels via generateLabelsApplication()
#   3. Optionally queues a Coolify-native redeploy (--redeploy)
#   4. Verifies https-0-* labels and health endpoints
#
# Usage:
#   bash scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh
#   bash scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh --redeploy
#   bash scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh --verify-only
set -euo pipefail

SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"
APP_UUID="${COOLIFY_APP_UUID:-ik6ml2uhw6op765lo14wn5m3}"
COOLIFY_API_URL="${COOLIFY_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"

REDEPLOY=false
VERIFY_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --redeploy) REDEPLOY=true ;;
    --verify-only) VERIFY_ONLY=true ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" bash -s -- \
  "$APP_UUID" "$COOLIFY_API_URL" "$REDEPLOY" "$VERIFY_ONLY" <<'REMOTE'
set -euo pipefail
APP_UUID="$1"
COOLIFY_API_URL="$2"
REDEPLOY="$3"
VERIFY_ONLY="$4"

http_host="${COOLIFY_API_URL#https://}"
http_host="${http_host#http://}"
HTTP_URL="http://${http_host}"

if [ "$VERIFY_ONLY" != "true" ]; then
  echo "==> Ensure FQDN uses https:// and regenerate Traefik labels"
  docker exec coolify php artisan tinker --execute="
\$app = App\\Models\\Application::where('uuid', '$APP_UUID')->firstOrFail();
\$fqdn = (string) \$app->fqdn;
if (str_starts_with(\$fqdn, 'http://')) {
    \$app->fqdn = 'https://' . substr(\$fqdn, 7);
}
if (! str_starts_with((string) \$app->fqdn, 'https://')) {
    throw new RuntimeException('applications.fqdn must be https:// for Traefik HTTPS routers');
}
\$labels = generateLabelsApplication(\$app);
\$encoded = implode(\"\\n\", \$labels);
if (! str_contains(\$encoded, 'traefik.http.routers.https-0-')) {
    throw new RuntimeException('generateLabelsApplication did not produce https-0 Traefik routers');
}
\$app->custom_labels = base64_encode(\$encoded);
\$app->save();
echo 'fqdn=' . \$app->fqdn . PHP_EOL;
echo 'https_label_count=' . substr_count(\$encoded, 'https-0-') . PHP_EOL;
" 2>&1
fi

if [ "$REDEPLOY" = "true" ]; then
  echo "==> Queue Coolify-native redeploy"
  docker exec coolify php artisan tinker --execute="
\$app = App\\Models\\Application::where('uuid', '$APP_UUID')->firstOrFail();
\$deployment_uuid = (new Visus\\Cuid2\\Cuid2())->toString();
\$result = queue_application_deployment(application: \$app, deployment_uuid: \$deployment_uuid, force_rebuild: false, no_questions_asked: true, is_api: true);
echo json_encode(\$result);
" 2>&1

  APP_ID=$(docker exec coolify-db psql -U coolify -d coolify -t -c "SELECT id FROM applications WHERE uuid='$APP_UUID';" | tr -d ' \n')
  echo "==> Wait for deployment (max 8 min)"
  for i in $(seq 1 96); do
    STATUS=$(docker exec coolify-db psql -U coolify -d coolify -t -c "SELECT status FROM application_deployment_queues WHERE application_id='$APP_ID' ORDER BY id DESC LIMIT 1;" | tr -d ' \n')
    echo "[${i}] ${STATUS:-unknown}"
    if [ "$STATUS" = "finished" ] || [ "$STATUS" = "success" ]; then break; fi
    if [ "$STATUS" = "failed" ] || [ "$STATUS" = "error" ]; then
      docker exec coolify-db psql -U coolify -d coolify -c "SELECT id,status,message,created_at FROM application_deployment_queues WHERE application_id='$APP_ID' ORDER BY id DESC LIMIT 1;"
      exit 1
    fi
    sleep 5
  done
fi

echo "==> Verify stored labels include https-0 routers"
HTTPS_COUNT=$(docker exec coolify-db psql -U coolify -d coolify -t -c "SELECT custom_labels FROM applications WHERE uuid='$APP_UUID';" | tr -d ' \n' | base64 -d | grep -c 'https-0-' || true)
echo "custom_labels https-0 lines: ${HTTPS_COUNT}"
if [ "${HTTPS_COUNT:-0}" -lt 5 ]; then
  echo "FAIL: expected at least 5 https-0 Traefik label lines in custom_labels" >&2
  exit 1
fi

if [ -f "/data/coolify/applications/${APP_UUID}/docker-compose.yaml" ]; then
  COMPOSE_HTTPS=$(grep -c 'https-0-' "/data/coolify/applications/${APP_UUID}/docker-compose.yaml" || true)
  echo "docker-compose.yaml https-0 lines: ${COMPOSE_HTTPS}"
  if [ "${COMPOSE_HTTPS:-0}" -lt 5 ]; then
    echo "WARN: compose file missing https labels; run with --redeploy" >&2
    exit 1
  fi
fi

echo "==> Health checks"
FAIL=0
HTTP_CODE=$(curl -sS -o /tmp/coolify-health.txt -w "%{http_code}" --max-time 25 "${HTTP_URL}/health")
echo "HTTP /health -> ${HTTP_CODE} (302 redirect-to-https is expected with https FQDN)"
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "302" ]; then FAIL=1; fi

for path in /health /api/healthz /api/healthz/audio; do
  CODE=$(curl -sS -o /tmp/coolify-health.txt -w "%{http_code}" --max-time 25 "${COOLIFY_API_URL}${path}")
  echo "HTTPS ${path} -> ${CODE}"
  head -c 120 /tmp/coolify-health.txt; echo
  if [ "$CODE" != "200" ]; then FAIL=1; fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "FAIL: one or more health checks did not pass" >&2
  exit 1
fi

echo "PASS: Coolify Traefik HTTPS labels and health endpoints verified"
REMOTE
