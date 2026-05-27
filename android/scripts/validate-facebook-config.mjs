#!/usr/bin/env node
/**
 * Ensures release builds include a real Meta client token for native Facebook Login.
 *
 * Set in android/local.properties (gitignored):
 *   facebook.clientToken=YOUR_META_CLIENT_TOKEN
 *
 * Meta → App Settings → Advanced → Client token
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const androidRoot = join(__dirname, "..");
const strict = process.argv.includes("--strict");

function fail(msg) {
  console.error(`[validate-facebook-config] ${msg}`);
  process.exit(strict ? 1 : 0);
}

function readPropFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const localProps = readPropFile(join(androidRoot, "local.properties"));
const keystoreProps = readPropFile(join(androidRoot, "keystore.properties"));
const token =
  process.env.FACEBOOK_CLIENT_TOKEN?.trim() ||
  localProps["facebook.clientToken"]?.trim() ||
  keystoreProps["facebook.clientToken"]?.trim() ||
  "";

if (!token || /^REPLACE_WITH/i.test(token)) {
  fail(
    "Missing Meta client token for native Facebook Login.\n" +
      "Add to android/local.properties:\n" +
      "  facebook.clientToken=YOUR_TOKEN\n" +
      "Get it from Meta Developer Console → App Settings → Advanced → Client token.",
  );
}

console.log("[validate-facebook-config] Meta client token present for release build.");
