#!/usr/bin/env bash
# Download NASA JPL planetary ephemeris (DE440 preferred, DE441 fallback).
# Run at image BUILD time — NEVER block chart generation or Coolify forever.
#
# Hard timeouts: stalled NASA mirrors previously left Coolify "In Progress" for 12h+.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${BIRTH_SKY_EPHEMERIS_DATA_DIR:-$ROOT/data}"
mkdir -p "$DATA_DIR"

BASE_URL="${JPL_SPK_BASE_URL:-https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets}"
# Connect quickly; abort stalled transfers (DE440 ~114MB; 15m is generous on slow links).
CONNECT_TIMEOUT="${JPL_CONNECT_TIMEOUT_SEC:-30}"
MAX_TIME="${JPL_MAX_TIME_SEC:-900}"

stage_start() {
  STAGE_NAME="$1"
  STAGE_T0=$(date +%s)
  echo "[ephemeris] START: ${STAGE_NAME}"
}

stage_end() {
  local code="${1:-0}"
  local elapsed=$(( $(date +%s) - STAGE_T0 ))
  echo "[ephemeris] END: ${STAGE_NAME} duration=${elapsed}s exit=${code}"
}

download_one() {
  local name="$1"
  local dest="$DATA_DIR/$name"
  if [[ -f "$dest" && -s "$dest" ]]; then
    echo "[ephemeris] already present: $dest ($(du -h "$dest" | awk '{print $1}'))"
    return 0
  fi
  local url="$BASE_URL/$name"
  echo "[ephemeris] downloading $url → $dest"
  echo "[ephemeris] timeouts: connect=${CONNECT_TIMEOUT}s max=${MAX_TIME}s"
  local tmp="$dest.tmp"
  rm -f "$tmp"
  if command -v curl >/dev/null 2>&1; then
    # --fail: HTTP errors → non-zero. --max-time: never hang Coolify builds.
    curl -fL \
      --connect-timeout "$CONNECT_TIMEOUT" \
      --max-time "$MAX_TIME" \
      --retry 3 \
      --retry-delay 2 \
      --retry-all-errors \
      -o "$tmp" \
      "$url"
  else
    wget --timeout="$CONNECT_TIMEOUT" --tries=3 -O "$tmp" "$url"
  fi
  if [[ ! -s "$tmp" ]]; then
    echo "[ephemeris] download produced empty file: $tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  mv "$tmp" "$dest"
  echo "[ephemeris] saved $dest ($(du -h "$dest" | awk '{print $1}'))"
  if command -v sha256sum >/dev/null 2>&1; then
    echo "[ephemeris] sha256: $(sha256sum "$dest" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    echo "[ephemeris] sha256: $(shasum -a 256 "$dest" | awk '{print $1}')"
  fi
}

stage_start "fetch-jpl-ephemeris"
trap 'stage_end $?' EXIT

if download_one "de440.bsp"; then
  echo "[ephemeris] using DE440"
  exit 0
fi

echo "[ephemeris] DE440 failed — trying DE441" >&2
download_one "de441.bsp"
echo "[ephemeris] using DE441"
