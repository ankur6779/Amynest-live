#!/usr/bin/env node
/**
 * Purge Cloudflare edge cache for poisoned static-audio URLs.
 *
 * Requires env (never logged):
 *   CLOUDFLARE_ZONE_ID
 *   CLOUDFLARE_API_TOKEN  (Zone.Cache Purge permission)
 *
 *   node scripts/purge-static-audio-cloudflare.mjs
 *   node scripts/purge-static-audio-cloudflare.mjs --urls scripts/data/p0-cloudflare-purge-urls.txt
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

for (const f of [".env", ".env.local", ".env.development", "Amynest-backend-dykj.env"]) {
  const p = join(repoRoot, f);
  if (existsSync(p)) config({ path: p, override: false });
}

const args = process.argv.slice(2);
const urlsIdx = args.indexOf("--urls");
const urlsFile =
  urlsIdx >= 0 && args[urlsIdx + 1]
    ? resolve(args[urlsIdx + 1])
    : join(repoRoot, "scripts/data/p0-cloudflare-purge-urls.txt");

const zoneId = (process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID || "").trim();
const token = (
  process.env.CLOUDFLARE_API_TOKEN ||
  process.env.CF_API_TOKEN ||
  process.env.CLOUDFLARE_TOKEN ||
  ""
).trim();

if (!zoneId || !token) {
  console.error(
    "Missing CLOUDFLARE_ZONE_ID and/or CLOUDFLARE_API_TOKEN. Set them in the environment, then re-run.",
  );
  process.exit(2);
}

const urls = readFileSync(urlsFile, "utf8")
  .split(/\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && l.startsWith("http"));

if (urls.length === 0) {
  console.error(`No URLs in ${urlsFile}`);
  process.exit(1);
}

console.log(`Purging ${urls.length} URLs from zone ${zoneId.slice(0, 4)}…`);

/** Cloudflare accepts max 30 URLs per purge request. */
const CHUNK = 30;
let ok = 0;
for (let i = 0; i < urls.length; i += CHUNK) {
  const chunk = urls.slice(i, i + CHUNK);
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: chunk }),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const errs = body?.errors ?? body;
    console.error(`Purge chunk ${i / CHUNK + 1} failed HTTP ${res.status}:`, errs);
    process.exit(1);
  }
  ok += chunk.length;
  console.log(`  purged ${ok}/${urls.length}`);
}

console.log("Cloudflare purge accepted for all URLs.");
