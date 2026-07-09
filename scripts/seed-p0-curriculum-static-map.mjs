#!/usr/bin/env node
/**
 * P0 — seed curriculum/UI words into static-audio-map from real phonics-library CVC clips.
 * Does not call OpenAI. For words that only have placeholder CDN audio, see
 * generate-static-audio -- --phrases-file.
 *
 *   node scripts/seed-p0-curriculum-static-map.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const ORIGIN = process.env.STATIC_AUDIO_ORIGIN?.replace(/\/$/, "") ?? "https://www.amynest.in";

const CURRICULUM_KEYS = [
  "sat", "fox", "mop", "top", "fin", "win", "lip", "zip", "kid", "lid",
  "mom", "yes", "car", "love", "home", "hello", "goodbye", "please", "thank you",
  "sorry", "small", "down", "look", "listen", "say", "read", "write", "draw",
  "pat", "hop", "pop", "jet",
];

const MAP_PATHS = [
  join(repoRoot, "artifacts/kidschedule/src/data/static-audio-map.json"),
  join(repoRoot, "artifacts/api-server/src/data/static-audio-map.json"),
];

const MIN_REAL_BYTES = 512;

async function probePhonicsCvc(word) {
  const path = `/api/phonics-library/phonics/cvc/${encodeURIComponent(word)}.mp3`;
  const res = await fetch(`${ORIGIN}${path}`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_REAL_BYTES) return null;
  // ID3 or MPEG frame — reject tiny placeholder
  const head = buf.slice(0, 3).toString("hex");
  if (head !== "494433" && head !== "fff3" && head !== "fffb" && buf.length < 2000) {
    // allow larger non-ID3 mp3s
    if (buf.length < 2000) return null;
  }
  if (buf.length < 2000) return null;
  return path;
}

async function main() {
  const mapPath = MAP_PATHS.find((p) => existsSync(p));
  if (!mapPath) throw new Error("static-audio-map.json not found");
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  map.default = map.default ?? {};

  const seeded = [];
  const stillMissing = [];

  for (const word of CURRICULUM_KEYS) {
    const key = word.trim().toLowerCase();
    const existing = map.default[key];
    if (existing && /\/api\/static-audio\/[a-f0-9]{32}\.mp3/i.test(existing)) {
      // verify not placeholder by probing
      const res = await fetch(`${ORIGIN}${existing}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length >= 2000) {
        seeded.push({ word: key, url: existing, action: "kept_static" });
        continue;
      }
    }
    const phonicsPath = await probePhonicsCvc(key);
    if (phonicsPath) {
      map.default[key] = phonicsPath;
      seeded.push({ word: key, url: phonicsPath, action: "seeded_phonics_cvc" });
    } else {
      stillMissing.push(key);
    }
  }

  const body = `${JSON.stringify(map, null, 2)}\n`;
  for (const p of MAP_PATHS) {
    writeFileSync(p, body, "utf8");
  }

  const phrasesPath = join(repoRoot, "scripts/data/p0-curriculum-missing-phrases.txt");
  writeFileSync(phrasesPath, stillMissing.join("\n") + (stillMissing.length ? "\n" : ""), "utf8");

  console.log(JSON.stringify({
    seeded: seeded.length,
    stillMissing: stillMissing.length,
    stillMissingWords: stillMissing,
    phrasesFile: phrasesPath,
    actions: seeded,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
