#!/usr/bin/env bash
# check-brand-hex-drift.sh
#
# Ensures the three centralised brand hex values:
#   #a855f7  (purple500)
#   #ec4899  (pink500)
#   #FF4ECD  (accent / BRAND_GRADIENT end — exported as ACCENT_PINK)
#
# …only appear inside constants/colors.ts and nowhere else in the mobile app.
# Catches any accidental re-hardcoding before it reaches main.
#
# Usage:
#   bash artifacts/amynest-mobile/scripts/check-brand-hex-drift.sh
#
# Exit codes:
#   0 – clean (no drift found)
#   1 – one or more rogue occurrences detected

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COLORS_FILE="constants/colors.ts"

# Case-insensitive pattern covers all case variants without enumerating them
BRAND_PATTERN='#a855f7|#ec4899|#ff4ecd'

# Search everything except generated/dependency directories and the canonical file
MATCHES=$(
  grep -riE "$BRAND_PATTERN" \
    --include="*.ts" \
    --include="*.tsx" \
    --include="*.js" \
    --include="*.jsx" \
    --include="*.json" \
    --exclude-dir=node_modules \
    --exclude-dir=".expo" \
    --exclude-dir=".git" \
    --exclude-dir="static-build" \
    --exclude-dir="dist" \
    --exclude-dir="build" \
    "$ROOT" \
  | grep -v "$COLORS_FILE"
)

if [ -z "$MATCHES" ]; then
  echo "✅  No brand hex drift detected. #a855f7 / #ec4899 / #FF4ECD are confined to $COLORS_FILE."
  exit 0
fi

echo "❌  Brand hex drift detected! The following files contain raw brand colour values"
echo "    that should only appear in $COLORS_FILE."
echo "    Replace each occurrence with the appropriate token from constants/colors.ts:"
echo "      ACCENT_PINK      (for #FF4ECD)"
echo "      brand.purple500  (for #A855F7 / #a855f7)"
echo "      brand.pink500    (for #EC4899 / #ec4899)"
echo "      BRAND_GRADIENT   (for the gradient [\"#a855f7\", \"#ec4899\"])"
echo ""
echo "$MATCHES"
exit 1
