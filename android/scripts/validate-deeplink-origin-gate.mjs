#!/usr/bin/env node
/**
 * Contract check: MainActivity.deepLinkToUrl must reject non-AmyNest absolute
 * http(s) URLs (exported Intent extras / FCM deepLink must not load arbitrary
 * origins into the Play WebView).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const main = readFileSync(
  join(root, "app/src/main/kotlin/com/amynest/app/MainActivity.kt"),
  "utf8",
);

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

const fn = main.match(
  /private fun deepLinkToUrl\(path: String, category: String\? = null\): String \{[\s\S]*?\n    \}/,
)?.[0];

assert(Boolean(fn), "deepLinkToUrl function found");

assert(
  fn?.includes("isAllowedAmyNestHttps(uri)") === true,
  "deepLinkToUrl gates absolute http(s) with isAllowedAmyNestHttps",
);

assert(
  !/if \(path\.startsWith\("http:\/\/"\) \|\| path\.startsWith\("https:\/\/"\)\) return path/.test(
    fn ?? "",
  ),
  "deepLinkToUrl does not blindly return absolute http(s) paths",
);

assert(
  fn?.includes("Rejected non-AmyNest absolute deepLink") === true,
  "deepLinkToUrl logs rejection for non-AmyNest hosts",
);

assert(
  /private fun isAllowedAmyNestHttps\(uri: Uri\): Boolean \{[\s\S]*?host == "www\.amynest\.in" \|\| host == "amynest\.in"/.test(
    main,
  ),
  "isAllowedAmyNestHttps allows only apex/www AmyNest hosts",
);

if (process.exitCode) {
  console.error("\nvalidate-deeplink-origin-gate FAILED");
  process.exit(1);
}
console.log("\nvalidate-deeplink-origin-gate PASSED");
