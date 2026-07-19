#!/usr/bin/env node
/**
 * Minimal Cloudflare Pages API helper (uses wrangler OAuth token from local config).
 * Usage: node scripts/cloudflare-pages-api.mjs <method> <path> [json-body]
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT = "362bb082e16cf42fbcd036e164f0fbc4";
const PROJECT = "amynest-web";

function loadToken() {
  const cfg = readFileSync(
    join(homedir(), "Library/Preferences/.wrangler/config/default.toml"),
    "utf8",
  );
  const m = cfg.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("wrangler oauth_token not found");
  return m[1];
}

const method = process.argv[2] ?? "GET";
const subpath = process.argv[3] ?? "";
const body = process.argv[4];

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}${subpath}`;
const res = await fetch(url, {
  method,
  headers: {
    Authorization: `Bearer ${loadToken()}`,
    "Content-Type": "application/json",
  },
  body: body ? body : undefined,
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
process.exit(json.success ? 0 : 1);
