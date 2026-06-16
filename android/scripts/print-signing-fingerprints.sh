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
echo "Meta → App settings → Basic → Android → Key Hashes (one per line)."
fb_hash_from_keystore() {
  local ks="$1" alias="$2" pass="${3:-}"
  local sha1_line
  if [[ -n "$pass" ]]; then
    sha1_line=$(keytool -list -v -keystore "$ks" -alias "$alias" -storepass "$pass" -keypass "$pass" 2>/dev/null | grep "SHA1:" | head -1 | sed 's/.*SHA1: //; s/://g' | tr '[:upper:]' '[:lower:]')
  else
    sha1_line=$(keytool -list -v -keystore "$ks" -alias "$alias" 2>/dev/null | grep "SHA1:" | head -1 | sed 's/.*SHA1: //; s/://g' | tr '[:upper:]' '[:lower:]')
  fi
  if [[ -n "$sha1_line" ]]; then
    echo -n "$sha1_line" | xxd -r -p | openssl base64 2>/dev/null || true
  fi
}

DEBUG_KS="${HOME}/.android/debug.keystore"
if [[ -f "$DEBUG_KS" ]]; then
  DEBUG_HASH=$(fb_hash_from_keystore "$DEBUG_KS" androiddebugkey android)
  if [[ -n "$DEBUG_HASH" ]]; then
    echo "Debug key hash (com.amynest.app.debug): $DEBUG_HASH"
  fi
else
  echo "Debug keystore not found at $DEBUG_KS"
fi

RELEASE_HASH=$(fb_hash_from_keystore "$KEYSTORE" "$ALIAS")
if [[ -n "$RELEASE_HASH" ]]; then
  echo "Release/upload key hash (com.amynest.app): $RELEASE_HASH"
fi
echo "Play Store installs: add App signing key hash from Play Console → Setup → App signing."
echo
echo "After adding fingerprints, re-download google-services.json and run:"
echo "  node android/scripts/validate-google-services.mjs --strict"
