#!/usr/bin/env node
/**
 * List Cloudflare purge URLs for P0 curriculum static-audio hashes that were
 * poisoned by immutable placeholder caching.
 *
 *   node scripts/list-static-audio-purge-urls.mjs
 *
 * Then purge in Cloudflare Dashboard → Caching → Purge → Custom URLs
 * (or CF API with CLOUDFLARE_ZONE_ID + CLOUDFLARE_API_TOKEN).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const map = JSON.parse(
  readFileSync(join(repoRoot, "artifacts/kidschedule/src/data/static-audio-map.json"), "utf8"),
);
const ORIGIN = "https://www.amynest.in";

const CURRICULUM = [
  "fox", "mop", "top", "zip", "kid", "lid", "mom", "yes", "car", "love", "home",
  "hello", "goodbye", "please", "thank you", "sorry", "small", "down", "look",
  "listen", "say", "read", "write", "draw", "hop", "pop", "jet",
];

const urls = [];
for (const word of CURRICULUM) {
  const entry = map.default?.[word];
  let hash = entry?.match(/\/static-audio\/([a-f0-9]{32})\.mp3/i)?.[1];
  if (!hash) {
    hash = createHash("md5").update(`default\0${word}`).digest("hex");
  }
  urls.push(`${ORIGIN}/api/static-audio/${hash}.mp3`);
}

const out = join(repoRoot, "scripts/data/p0-cloudflare-purge-urls.txt");
writeFileSync(out, urls.join("\n") + "\n");
console.log(`Wrote ${urls.length} purge URLs → ${out}`);
for (const u of urls) console.log(u);
