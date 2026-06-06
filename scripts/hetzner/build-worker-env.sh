#!/usr/bin/env bash
# Build /opt/amynest/worker.env for Hetzner from local Render env + external URLs.
#
# Usage:
#   REDIS_URL_EXTERNAL='rediss://...' DATABASE_URL_EXTERNAL='postgresql://...' \
#     bash scripts/hetzner/build-worker-env.sh
#
# Or pass a file with overrides:
#   bash scripts/hetzner/build-worker-env.sh --overrides /path/to/hetzner-overrides.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="${AMYNEST_RENDER_ENV:-$ROOT/Amynest-backend-dykj.env}"
OUT="${HETZNER_WORKER_ENV:-$ROOT/.hetzner-worker.env}"
OVERRIDES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --overrides) OVERRIDES="$2"; shift 2 ;;
    -h|--help)
      sed -n '1,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$SOURCE" ]]; then
  echo "Source env not found: $SOURCE" >&2
  echo "Set AMYNEST_RENDER_ENV or copy Render worker env to Amynest-backend-dykj.env" >&2
  exit 1
fi

# shellcheck disable=SC1090
source_env() {
  local file="$1"
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    export "$line"
  done < "$file"
}

source_env "$SOURCE"
if [[ -n "$OVERRIDES" && -f "$OVERRIDES" ]]; then
  source_env "$OVERRIDES"
fi

REDIS_URL="${REDIS_URL_EXTERNAL:-${REDIS_URL:-}}"
DATABASE_URL="${DATABASE_URL_EXTERNAL:-${DATABASE_URL:-}}"

derive_external_postgres_url() {
  local url="$1"
  local region="${RENDER_POSTGRES_REGION:-singapore}"
  if [[ "$url" == *".render.com"* ]]; then
    printf '%s' "$url"
    return
  fi
  # Render internal: postgresql://user:pass@dpg-xxx-a/dbname
  if [[ "$url" =~ @dpg-[^/]+-a/ ]]; then
    echo "$url" | sed -E "s/@(dpg-[^/]+-a)\//@\1.${region}-postgres.render.com\//"
    return
  fi
  printf '%s' "$url"
}

if [[ -z "$REDIS_URL" ]]; then
  echo "REDIS_URL_EXTERNAL is required (Render Key Value external URL with rediss://)" >&2
  exit 1
fi

if [[ "$REDIS_URL" == redis://red-* ]]; then
  echo "REDIS_URL looks like Render internal URL — use external rediss:// URL from Render Connect tab" >&2
  exit 1
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL missing from source env" >&2
  exit 1
fi

DATABASE_URL="$(derive_external_postgres_url "$DATABASE_URL")"
if [[ "$DATABASE_URL" != *".render.com"* ]]; then
  echo "DATABASE_URL could not be derived as external — set DATABASE_URL_EXTERNAL manually" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
cat >"$OUT" <<EOF
NODE_ENV=production
AMYNEST_ENV=production
AMYNEST_AI_WORKER_MODE=standalone
WORKER_ENABLED=true
WORKER_HEALTH_PORT=9090

REDIS_URL=${REDIS_URL}
DATABASE_URL=${DATABASE_URL}

OPENAI_API_KEY=${OPENAI_API_KEY:-}
GOOGLE_API_KEY=${GOOGLE_API_KEY:-}
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-}
GCS_SERVICE_ACCOUNT_JSON=${GCS_SERVICE_ACCOUNT_JSON:-}
DEFAULT_OBJECT_STORAGE_BUCKET_ID=${DEFAULT_OBJECT_STORAGE_BUCKET_ID:-}
GCS_BUCKET_NAME=${GCS_BUCKET_NAME:-}
GCS_PROJECT_ID=${GCS_PROJECT_ID:-}
TTS_USE_GCS=${TTS_USE_GCS:-true}
TTS_ELEVENLABS_FALLBACK_ENABLED=${TTS_ELEVENLABS_FALLBACK_ENABLED:-}
OPENAI_TTS_VOICE=${OPENAI_TTS_VOICE:-}
OPENAI_TTS_ACCENT=${OPENAI_TTS_ACCENT:-}
SESSION_SECRET=${SESSION_SECRET:-}
PHONICS_SESSION_SECRET=${PHONICS_SESSION_SECRET:-}

AI_MAX_CONCURRENT_JOBS=${AI_MAX_CONCURRENT_JOBS:-25}
AI_JOB_TIMEOUT_MS=${AI_JOB_TIMEOUT_MS:-10000}
AI_JOB_RESULT_TTL_SEC=${AI_JOB_RESULT_TTL_SEC:-600}
REDIS_CONNECT_TIMEOUT_MS=${REDIS_CONNECT_TIMEOUT_MS:-30000}
REDIS_COMMAND_TIMEOUT_MS=${REDIS_COMMAND_TIMEOUT_MS:-30000}
EOF

chmod 600 "$OUT"
echo "[hetzner] wrote $OUT ($(wc -l <"$OUT" | tr -d ' ') lines)"
