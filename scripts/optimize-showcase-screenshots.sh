#!/usr/bin/env bash
# Regenerate WebP showcase screenshots for /get-app product tour.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../artifacts/kidschedule/public/landing/screenshots" && pwd)"
SLIDES=(meet-amy dashboard parenting-hub gaming-hub health-zone creativity learning-zone family-goals audio-lessons)

for f in "${SLIDES[@]}"; do
  src="${ROOT}/${f}.png"
  [[ -f "$src" ]] || { echo "missing $src" >&2; exit 1; }
  tmp450="$(mktemp).png"
  tmp800="$(mktemp).png"
  sips -Z 450 "$src" --out "$tmp450" >/dev/null
  cwebp -q 72 "$tmp450" -o "${ROOT}/${f}-450.webp" -quiet
  sips -Z 800 "$src" --out "$tmp800" >/dev/null
  cwebp -q 72 "$tmp800" -o "${ROOT}/${f}-800.webp" -quiet
  rm -f "$tmp450" "$tmp800"
  echo "ok ${f}"
done
