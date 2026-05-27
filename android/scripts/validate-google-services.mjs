#!/usr/bin/env node
/**
 * Validates android/app/google-services.json includes an Android OAuth client
 * (client_type 1) with certificate_hash for com.amynest.app.
 *
 * Native Google Sign-In (AuthBridge) fails with DEVELOPER_ERROR when this is missing.
 *
 * Usage:
 *   node android/scripts/validate-google-services.mjs [--strict]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "../app/google-services.json");
const PACKAGE = "com.amynest.app";
const DEBUG_PACKAGE = "com.amynest.app.debug";
const strict = process.argv.includes("--strict");

function fail(msg) {
  console.error(`[validate-google-services] ${msg}`);
  process.exit(strict ? 1 : 0);
}

function warn(msg) {
  console.warn(`[validate-google-services] WARNING: ${msg}`);
}

if (!existsSync(jsonPath)) {
  fail(
    "google-services.json not found at android/app/google-services.json — " +
      "download from Firebase Console (Android app com.amynest.app) before release builds.",
  );
}

let data;
try {
  data = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON: ${e.message}`);
}

const clients = Array.isArray(data.client) ? data.client : [];

function findClient(packageName) {
  return clients.find(
    (c) => c?.client_info?.android_client_info?.package_name === packageName,
  );
}

function androidOAuthClients(client) {
  const oauth = Array.isArray(client?.oauth_client) ? client.oauth_client : [];
  return oauth.filter((o) => o?.client_type === 1 && o?.android_info?.certificate_hash);
}

const prod = findClient(PACKAGE);
if (!prod) {
  fail(`No Firebase Android app entry for package ${PACKAGE}. Add it in Firebase Console.`);
}

const prodAndroidOAuth = androidOAuthClients(prod);
if (prodAndroidOAuth.length === 0) {
  fail(
    `Missing Android OAuth client (client_type 1 + certificate_hash) for ${PACKAGE}. ` +
      "In Firebase Console → Project Settings → Your apps → com.amynest.app, add SHA-1 " +
      "fingerprints for: (1) upload/release keystore, (2) Play Console App Signing certificate. " +
      "Then re-download google-services.json.",
  );
}

const webOAuth = (Array.isArray(prod.oauth_client) ? prod.oauth_client : []).filter(
  (o) => o?.client_type === 3,
);
if (webOAuth.length === 0) {
  warn(`No web OAuth client (client_type 3) for ${PACKAGE} — AuthBridge requestIdToken needs one.`);
}

console.info(
  `[validate-google-services] OK: ${PACKAGE} has ${prodAndroidOAuth.length} Android OAuth client(s):`,
);
for (const o of prodAndroidOAuth) {
  console.info(
    `  - sha1=${o.android_info.certificate_hash} client_id=…${String(o.client_id).slice(-12)}`,
  );
}

const debug = findClient(DEBUG_PACKAGE);
if (debug) {
  const debugOAuth = androidOAuthClients(debug);
  if (debugOAuth.length === 0) {
    warn(
      `${DEBUG_PACKAGE} has no Android OAuth client — local debug APK sign-in will fail with developer_error.`,
    );
  }
} else {
  warn(
    `No Firebase entry for ${DEBUG_PACKAGE} — optional; add debug SHA-1 if you sideload debug builds.`,
  );
}

console.info("[validate-google-services] Validation passed.");
