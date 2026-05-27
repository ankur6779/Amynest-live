#!/usr/bin/env bash
# Print SHA-1 / SHA-256 for Firebase Google Sign-In configuration.
#
# Add BOTH fingerprints to Firebase Console → Project Settings → Android app com.amynest.app:
#   1. Upload / release keystore (below)
#   2. Play Console → Setup → App signing → App signing key certificate
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROPS="$ROOT/keystore.properties"
KEYSTORE="$ROOT/app/amynest-release.jks"
ALIAS="${KEY_ALIAS:-amynest}"

if [[ -f "$PROPS" ]]; then
  # shellcheck disable=SC1090
  source <(grep -E '^(storeFile|keyAlias)=' "$PROPS" | sed 's/^/export /; s/=/="/; s/$/"/')
  if [[ -n "${storeFile:-}" ]]; then
    KEYSTORE="$ROOT/${storeFile#./}"
  fi
  if [[ -n "${keyAlias:-}" ]]; then
    ALIAS="$keyAlias"
  fi
fi

echo "=== AmyNest Android signing fingerprints ==="
echo "Keystore: $KEYSTORE"
echo "Alias:    $ALIAS"
echo

if [[ ! -f "$KEYSTORE" ]]; then
  echo "Keystore not found. Create one (see android/README.md) or set storeFile in keystore.properties."
  exit 1
fi

echo "--- Upload / release keystore (add SHA-1 to Firebase) ---"
keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" 2>/dev/null | grep -E "SHA1:|SHA256:" || {
  echo "Run: keytool -list -v -keystore \"$KEYSTORE\" -alias \"$ALIAS\""
  exit 1
}

echo
echo "--- Meta Facebook Login (Android key hash) ---"
echo "Add to Meta Developer Console → Facebook Login → Android → Key Hashes."
SHA1_LINE=$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" 2>/dev/null | grep "SHA1:" | head -1 | sed 's/.*SHA1: //; s/://g' | tr '[:upper:]' '[:lower:]')
if [[ -n "$SHA1_LINE" ]]; then
  FB_HASH=$(echo -n "$SHA1_LINE" | xxd -r -p | openssl base64 2>/dev/null || true)
  if [[ -n "$FB_HASH" ]]; then
    echo "Release key hash: $FB_HASH"
  fi
fi
echo "Also add Play App Signing certificate key hash from Play Console (Setup → App signing)."
echo
echo "After adding fingerprints, re-download google-services.json and run:"
echo "  node android/scripts/validate-google-services.mjs --strict"
