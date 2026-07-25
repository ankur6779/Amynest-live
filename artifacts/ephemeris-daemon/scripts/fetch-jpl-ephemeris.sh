#!/usr/bin/env bash
# Download NASA JPL planetary ephemeris (DE440 preferred, DE441 fallback).
# Run at build/deploy time — NEVER during chart generation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${BIRTH_SKY_EPHEMERIS_DATA_DIR:-$ROOT/data}"
mkdir -p "$DATA_DIR"

BASE_URL="${JPL_SPK_BASE_URL:-https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets}"

download_one() {
  local name="$1"
  local dest="$DATA_DIR/$name"
  if [[ -f "$dest" && -s "$dest" ]]; then
    echo "[ephemeris] already present: $dest ($(du -h "$dest" | awk '{print $1}'))"
    return 0
  fi
  local url="$BASE_URL/$name"
  echo "[ephemeris] downloading $url → $dest"
  local tmp="$dest.tmp"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --retry-delay 2 -o "$tmp" "$url"
  else
    wget -O "$tmp" "$url"
  fi
  mv "$tmp" "$dest"
  echo "[ephemeris] saved $dest ($(du -h "$dest" | awk '{print $1}'))"
  if command -v shasum >/dev/null 2>&1; then
    echo "[ephemeris] sha256: $(shasum -a 256 "$dest" | awk '{print $1}')"
  fi
}

if download_one "de440.bsp"; then
  echo "[ephemeris] using DE440"
  exit 0
fi

echo "[ephemeris] DE440 failed — trying DE441" >&2
download_one "de441.bsp"
echo "[ephemeris] using DE441"
