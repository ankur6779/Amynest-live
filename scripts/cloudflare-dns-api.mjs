#!/usr/bin/env node
/**
 * Cloudflare zone DNS helper (uses wrangler OAuth token from local config).
 * Usage: node scripts/cloudflare-dns-api.mjs <method> <zone> <path> [json-body]
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ZONE = "amynest.in";

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
const zone = process.argv[3] ?? ZONE;
const subpath = process.argv[4] ?? "/dns_records";
const query = process.argv[5] ?? "";
const body = process.argv[6];

const url = `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zone)}`;
const zoneRes = await fetch(url, {
  headers: { Authorization: `Bearer ${loadToken()}` },
});
const zoneJson = await zoneRes.json();
const zoneId = zoneJson.result?.[0]?.id;
if (!zoneId) {
  console.error(JSON.stringify(zoneJson, null, 2));
  process.exit(1);
}

const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}${subpath}${query}`;
const res = await fetch(apiUrl, {
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
