#!/usr/bin/env bash
# Build a signed (or unsigned) Play Store AAB locally.
#
# Usage (from repo root or this folder):
#   cd artifacts/kidschedule-android
#   bash scripts/build-release-aab.sh
#
# Requires: JDK 17+, Android SDK (ANDROID_HOME or Android Studio).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WRAPPER_URL="${WRAPPER_URL:-https://www.amynest.in}"
RC_KEY="${REVENUECAT_API_KEY:-goog_wswrltSsrqhqrsQrVvOPavTIzMA}"

if [[ -z "${ANDROID_HOME:-}" ]]; then
  for candidate in \
    "$HOME/Android/Sdk" \
    "$HOME/Library/Android/sdk" \
    "${ANDROID_SDK_ROOT:-}"; do
    if [[ -n "$candidate" && -d "$candidate" ]]; then
      export ANDROID_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
  echo "ERROR: Android SDK not found."
  echo "Install Android Studio, or set ANDROID_HOME to your SDK path."
  echo "Example: export ANDROID_HOME=\$HOME/Android/Sdk"
  exit 1
fi

echo "sdk.dir=$ANDROID_HOME" > local.properties
echo "Using ANDROID_HOME=$ANDROID_HOME"

if [[ ! -f app/google-services.json ]]; then
  echo "WARN: app/google-services.json missing — FCM disabled in this build."
  echo "      Download from Firebase Console → Android app com.amynest.app"
fi

if [[ ! -f keystore.properties ]]; then
  echo "WARN: keystore.properties missing — AAB will be UNSIGNED."
  echo "      Play Store upload needs a signed AAB. Run: bash scripts/generate-keystore.sh"
  echo "      Then create keystore.properties (see keystore.properties.example)."
else
  echo "OK: keystore.properties found — release will be signed."
fi

chmod +x ./gradlew
./gradlew clean bundleRelease \
  -PwrapperUrl="$WRAPPER_URL" \
  -PrevenueCatApiKey="$RC_KEY"

OUT="$ROOT/app/build/outputs/bundle/release"
echo ""
echo "=============================================="
echo "  AAB build finished"
echo "=============================================="
if [[ -f "$OUT/app-release.aab" ]]; then
  ls -lh "$OUT/app-release.aab"
  echo ""
  echo "Full path:"
  echo "  $OUT/app-release.aab"
elif [[ -f "$OUT/app-release-signed.aab" ]]; then
  ls -lh "$OUT/app-release-signed.aab"
else
  echo "Listing $OUT:"
  ls -lah "$OUT" || true
fi
echo ""
echo "Upload app-release.aab to Play Console → Production → Create release"
