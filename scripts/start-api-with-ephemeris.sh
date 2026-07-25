#!/usr/bin/env bash
# Run ephemeris daemon + API server together (dev / Docker entrypoint helper).
# Daemon auto-restarts on crash; API waits for /readyz before starting Node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
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

cleanup() {
  if [[ -n "${DAEMON_PID:-}" ]] && kill -0 "$DAEMON_PID" 2>/dev/null; then
    kill "$DAEMON_PID" 2>/dev/null || true
    wait "$DAEMON_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

start_daemon() {
  (
    cd "$DAEMON_DIR"
    while true; do
      echo "[ephemeris] starting daemon"
      bash scripts/start.sh || true
      echo "[ephemeris] daemon exited — restarting in 2s"
      sleep 2
    done
  ) &
  DAEMON_PID=$!
}

wait_ready() {
  local i=0
  until curl -fsS "$EPHEMERIS_URL/readyz" >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ $i -gt 60 ]]; then
      echo "[ephemeris] timed out waiting for $EPHEMERIS_URL/readyz" >&2
      exit 1
    fi
    sleep 1
  done
  echo "[ephemeris] ready at $EPHEMERIS_URL"
}

start_daemon
wait_ready

export BIRTH_SKY_EPHEMERIS_URL="$EPHEMERIS_URL"
export BIRTH_SKY_EPHEMERIS_PORT="$HOST_PORT"

if [[ "${1:-}" == "--dev" ]]; then
  shift
  cd "$ROOT"
  exec pnpm run dev:api "$@"
fi

# Production: Node dist (repo or Docker /app layout)
if [[ -f "$ROOT/artifacts/api-server/dist/index.mjs" ]]; then
  cd "$ROOT/artifacts/api-server"
  exec node --enable-source-maps dist/index.mjs "$@"
fi

if [[ -f "$ROOT/dist/index.mjs" ]]; then
  cd "$ROOT"
  exec node --enable-source-maps dist/index.mjs "$@"
fi

echo "No API entrypoint found under $ROOT" >&2
exit 1
