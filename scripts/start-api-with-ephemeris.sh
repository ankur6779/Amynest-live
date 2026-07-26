#!/usr/bin/env bash
# Supervise ephemeris daemon + production API (Docker / Coolify entrypoint).
# Daemon auto-restarts on crash; API waits for /readyz before starting Node.
# Never uses pnpm/vite/tsx watch in production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOT_T0=$(date +%s)

log_stage() {
  echo "[api+ephemeris] $1"
}

if [[ -d "$ROOT/artifacts/ephemeris-daemon" ]]; then
  DAEMON_DIR="$ROOT/artifacts/ephemeris-daemon"
elif [[ -d "$ROOT/ephemeris-daemon" ]]; then
  DAEMON_DIR="$ROOT/ephemeris-daemon"
elif [[ -d "/app/ephemeris-daemon" ]]; then
  DAEMON_DIR="/app/ephemeris-daemon"
else
  echo "[ephemeris] daemon directory not found" >&2
  exit 1
fi

EPHEMERIS_URL="${BIRTH_SKY_EPHEMERIS_URL:-http://127.0.0.1:5099}"
HOST_PORT="${BIRTH_SKY_EPHEMERIS_PORT:-5099}"
export BIRTH_SKY_EPHEMERIS_DATA_DIR="${BIRTH_SKY_EPHEMERIS_DATA_DIR:-$DAEMON_DIR/data}"
# Production images must ship kernels — never hang Coolify on NASA downloads.
export ALLOW_RUNTIME_EPHEMERIS_FETCH="${ALLOW_RUNTIME_EPHEMERIS_FETCH:-0}"
export ALLOW_RUNTIME_EPHEMERIS_SETUP="${ALLOW_RUNTIME_EPHEMERIS_SETUP:-0}"

# Bound readiness wait (seconds). Coolify must never wait forever.
READY_TIMEOUT_SEC="${EPHEMERIS_READY_TIMEOUT_SEC:-60}"

cleanup() {
  local code=$?
  if [[ -n "${DAEMON_PID:-}" ]] && kill -0 "$DAEMON_PID" 2>/dev/null; then
    kill "$DAEMON_PID" 2>/dev/null || true
    wait "$DAEMON_PID" 2>/dev/null || true
  fi
  log_stage "END: boot duration=$(( $(date +%s) - BOOT_T0 ))s exit=${code}"
}
trap cleanup EXIT INT TERM

start_daemon() {
  log_stage "START: ephemeris-supervisor"
  (
    cd "$DAEMON_DIR"
    while true; do
      echo "[ephemeris] starting daemon"
      # Failures restart; start.sh itself must not hang (no unbounded curl).
      bash scripts/start.sh || true
      echo "[ephemeris] daemon exited — restarting in 2s"
      sleep 2
    done
  ) &
  DAEMON_PID=$!
  log_stage "END: ephemeris-supervisor-fork pid=${DAEMON_PID} duration=0s exit=0"
}

wait_ready() {
  log_stage "START: wait-readyz timeout=${READY_TIMEOUT_SEC}s"
  local t0=$(date +%s)
  local i=0
  until curl -fsS --connect-timeout 2 --max-time 3 "$EPHEMERIS_URL/readyz" >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ $i -gt "$READY_TIMEOUT_SEC" ]]; then
      log_stage "END: wait-readyz duration=$(( $(date +%s) - t0 ))s exit=1"
      echo "[ephemeris] timed out waiting for $EPHEMERIS_URL/readyz" >&2
      exit 1
    fi
    sleep 1
  done
  log_stage "END: wait-readyz duration=$(( $(date +%s) - t0 ))s exit=0"
  echo "[ephemeris] ready at $EPHEMERIS_URL"
}

start_daemon
wait_ready

export BIRTH_SKY_EPHEMERIS_URL="$EPHEMERIS_URL"
export BIRTH_SKY_EPHEMERIS_PORT="$HOST_PORT"

if [[ "${1:-}" == "--dev" ]]; then
  shift
  cd "$ROOT"
  log_stage "START: api-dev (tsx watch — local only)"
  # Dev path only when explicitly requested.
  exec pnpm run dev:api "$@"
fi

# Production: Node dist (repo or Docker /app layout) — never watch mode.
log_stage "START: api-production"
if [[ -f "$ROOT/artifacts/api-server/dist/index.mjs" ]]; then
  cd "$ROOT/artifacts/api-server"
  trap - EXIT
  log_stage "END: boot-handoff duration=$(( $(date +%s) - BOOT_T0 ))s exit=0"
  exec node --enable-source-maps dist/index.mjs "$@"
fi

if [[ -f "$ROOT/dist/index.mjs" ]]; then
  cd "$ROOT"
  trap - EXIT
  log_stage "END: boot-handoff duration=$(( $(date +%s) - BOOT_T0 ))s exit=0"
  exec node --enable-source-maps dist/index.mjs "$@"
fi

echo "No API entrypoint found under $ROOT" >&2
exit 1
