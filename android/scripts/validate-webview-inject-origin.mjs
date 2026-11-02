#!/usr/bin/env node
/**
 * Static guard: Auth/Billing JavascriptInterface inject bridges must not forge
 * CANONICAL_WRAPPER_URL, and must gate on the live WebView URL. External https
 * must not load inside the WebView (inherits AmyNestAuthInject / BillingInject).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

/** Mirror of WebViewOrigins.isTrustedAmyNestHost / isTrustedWebViewUrl (logic only). */
function isTrustedAmyNestHost(host) {
  if (!host) return false;
  const h = String(host).toLowerCase();
  return h === "amynest.in" || h === "www.amynest.in" || h.endsWith(".amynest.in");
}

function isTrustedWebViewUrl(url) {
  if (!url) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  return isTrustedAmyNestHost(parsed.hostname);
}

const origins = read("app/src/main/kotlin/com/amynest/app/WebViewOrigins.kt");
const auth = read("app/src/main/kotlin/com/amynest/app/AuthBridge.kt");
const billing = read("app/src/main/kotlin/com/amynest/app/BillingBridge.kt");
const main = read("app/src/main/kotlin/com/amynest/app/MainActivity.kt");

assert(
  origins.includes("fun isTrustedWebViewUrl(url: String?): Boolean"),
  "WebViewOrigins.isTrustedWebViewUrl exists",
);

assert(
  !/AuthInjectInterface[\s\S]*?deliverJsReply\(\s*wv,\s*rawMessage,\s*Uri\.parse\(\s*WebViewOrigins\.CANONICAL_WRAPPER_URL\s*\)/.test(
    auth,
  ),
  "AuthInject postMessage does not forge CANONICAL_WRAPPER_URL",
);

assert(
  !/BillingInjectInterface[\s\S]*?deliverJsReply\(\s*wv,\s*rawMessage,\s*Uri\.parse\(\s*WebViewOrigins\.CANONICAL_WRAPPER_URL\s*\)/.test(
    billing,
  ),
  "BillingInject postMessage does not forge CANONICAL_WRAPPER_URL",
);

assert(
  /getPendingGoogleIdToken[\s\S]*?isTrustedWebViewUrl/.test(auth),
  "getPendingGoogleIdToken gates on trusted WebView URL",
);

assert(
  /getPendingFacebookAccessToken[\s\S]*?isTrustedWebViewUrl/.test(auth),
  "getPendingFacebookAccessToken gates on trusted WebView URL",
);

assert(
  /fun deliverPendingGoogleAuthIfAny[\s\S]*?isTrustedWebViewUrl/.test(auth),
  "deliverPendingGoogleAuthIfAny gates on trusted WebView URL",
);

assert(
  /fun deliverPendingFacebookAuthIfAny[\s\S]*?isTrustedWebViewUrl/.test(auth),
  "deliverPendingFacebookAuthIfAny gates on trusted WebView URL",
);

assert(
  /shouldOverrideUrlLoading[\s\S]*?isTrustedAmyNestHost\(host\)[\s\S]*?openExternally/.test(main),
  "MainActivity opens non-AmyNest https externally instead of in-WebView",
);

const cases = [
  ["https://www.amynest.in/", true],
  ["https://amynest.in/login", true],
  ["https://app.amynest.in/x", true],
  ["https://evil.example/phish", false],
  ["https://amynest.in.evil.com/", false],
  ["javascript:alert(1)", false],
  ["", false],
  [null, false],
];

for (const [url, expected] of cases) {
  const got = isTrustedWebViewUrl(url);
  assert(got === expected, `isTrustedWebViewUrl(${JSON.stringify(url)}) === ${expected}`);
}

if (process.exitCode) {
  console.error("\nvalidate-webview-inject-origin: FAILED");
  process.exit(process.exitCode);
}
console.log("\nvalidate-webview-inject-origin: PASSED");
