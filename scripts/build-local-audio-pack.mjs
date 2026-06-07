#!/usr/bin/env node
/**
 * Build bundled recovery clips into kidschedule/public/audio-pack (release / CI).
 *
 *   node scripts/build-local-audio-pack.mjs [--tier minimal|full] [--spelling-limit 500] [--force]
 *
 * Downloads via production static-audio API (GCS is not public). Validates unique clips.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packRoot = join(repoRoot, "artifacts/kidschedule/public/audio-pack");
const staticMapPath = join(repoRoot, "artifacts/kidschedule/src/data/static-audio-map.json");

const tier = process.argv.includes("--tier")
  ? process.argv[process.argv.indexOf("--tier") + 1]
  : "minimal";
const force = process.argv.includes("--force");
const spellingLimit = Number(
  process.argv.includes("--spelling-limit")
    ? process.argv[process.argv.indexOf("--spelling-limit") + 1]
    : tier === "full"
      ? 500
      : 60,
);

const staticMap = JSON.parse(readFileSync(staticMapPath, "utf8"));
const defaultMap = staticMap.default ?? {};
const phonicsMap = staticMap.phonics ?? {};
const audioUrlMap = { ...defaultMap, ...phonicsMap };

const ORIGIN =
  process.env.STATIC_AUDIO_ORIGIN?.replace(/\/$/, "") ?? "https://www.amynest.in";

const LETTER_ALIAS = {
  a: "a as in apple",
  e: "e as in egg",
  i: "i as in igloo",
  o: "o as in octopus",
  u: "u as in umbrella",
};

const LETTER_FOR = {
  a: "a for apple",
  c: "c for cat",
  e: "e for elephant",
  i: "i for ice cream",
  o: "o for orange",
  q: "q for queen",
  u: "u for umbrella",
  x: "x for x-ray",
};

const CVC_WORDS = [
  "cat", "bat", "mat", "sat", "pat", "dog", "log", "fog", "pen", "hen", "ten",
  "sit", "hit", "cup", "sun", "hat", "rat", "pig", "bed", "bus",
];

const COACH_LINES = [
  "Good job!",
  "Try again",
  "Well done",
  "Listen carefully",
  "Great job!",
  "Your turn.",
  "Listen and repeat.",
  "Let's try that again.",
  "I'm listening.",
  "Can you say this?",
  "Say it with me.",
  "That was excellent.",
  "Nice try.",
  "Let's begin!",
  "Ready? Let's start!",
  "Take your time.",
  "Let's try together.",
];

const SPELLING_SEED = [
  "cat", "dog", "sun", "hat", "bat", "pig", "cup", "bus", "bed", "pen", "run", "fun",
  "hen", "ten", "red", "big", "log", "fog", "jam", "map", "tap", "sat", "mat", "rat",
];

function slug(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function hashFromGcsUrl(gcsUrl) {
  const m = String(gcsUrl).match(/\/static-audio\/([a-f0-9]{32})\.mp3/i);
  return m?.[1]?.toLowerCase() ?? null;
}

function urlForAudioKey(key) {
  const raw = key.trim();
  const lower = raw.toLowerCase();
  return (
    audioUrlMap[lower] ??
    audioUrlMap[raw] ??
    audioUrlMap[LETTER_ALIAS[lower] ?? ""] ??
    audioUrlMap[LETTER_FOR[lower] ?? ""] ??
    null
  );
}

async function downloadClip(gcsUrl, destPath) {
  const hash = hashFromGcsUrl(gcsUrl);
  if (!hash) return false;

  if (existsSync(destPath) && !force) {
    const buf = readFileSync(destPath);
    if (buf.length > 0 && buf.length < 200_000) return true;
  }

  const apiUrl = `${ORIGIN}/api/static-audio/${hash}.mp3`;
  let res = await fetch(apiUrl);
  if (!res.ok) {
    res = await fetch(gcsUrl);
  }
  if (!res.ok) return false;

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) return false;

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buf);
  return true;
}

const entries = {};
let ok = 0;
let fail = 0;

async function addEntry(category, id, gcsUrl) {
  if (!gcsUrl) {
    fail += 1;
    console.warn(`skip missing url: ${category}:${id}`);
    return;
  }
  const file = `${category}/${slug(id)}.mp3`;
  const dest = join(packRoot, file);
  const got = await downloadClip(gcsUrl, dest);
  if (!got) {
    fail += 1;
    console.warn(`download failed: ${category}:${id}`);
    return;
  }
  const keyLower = `${category}:${id.trim().toLowerCase()}`;
  const keyRaw = `${category}:${id.trim()}`;
  entries[keyLower] = file;
  if (keyRaw !== keyLower) entries[keyRaw] = file;
  ok += 1;
}

function clearStubMp3s() {
  if (!existsSync(packRoot)) return;
  for (const name of readdirSync(packRoot)) {
    const p = join(packRoot, name);
    if (statSync(p).isDirectory()) {
      for (const fn of readdirSync(p)) {
        if (fn.endsWith(".mp3")) unlinkSync(join(p, fn));
      }
    }
  }
}

function validatePack() {
  const hashes = new Map();
  let mp3Count = 0;
  for (const name of readdirSync(packRoot)) {
    const p = join(packRoot, name);
    if (!statSync(p).isDirectory()) continue;
    for (const fn of readdirSync(p)) {
      if (!fn.endsWith(".mp3")) continue;
      mp3Count += 1;
      const buf = readFileSync(join(p, fn));
      const h = createHash("sha256").update(buf).digest("hex");
      hashes.set(h, (hashes.get(h) ?? 0) + 1);
    }
  }
  const unique = hashes.size;
  const maxDup = Math.max(0, ...hashes.values());
  if (mp3Count < 40) {
    throw new Error(`Pack too small: ${mp3Count} mp3 files (need >= 40)`);
  }
  if (unique < Math.min(30, Math.floor(mp3Count * 0.5))) {
    throw new Error(
      `Pack looks like stubs: ${unique} unique hashes across ${mp3Count} files (max dup ${maxDup})`,
    );
  }
  return { mp3Count, uniqueHashes: unique };
}

async function main() {
  mkdirSync(packRoot, { recursive: true });
  if (force) clearStubMp3s();

  const letters =
    tier === "full"
      ? Object.keys(phonicsMap)
      : [
          ..."abcdefghijklmnopqrstuvwxyz".split(""),
          "sh",
          "ch",
          "th",
          "ng",
        ];

  for (const L of letters) {
    const phrase = LETTER_ALIAS[L] ?? L;
    await addEntry("phonics-letter", L, urlForAudioKey(phrase) ?? urlForAudioKey(L));
    if (LETTER_ALIAS[L]) {
      await addEntry("phonics-letter", LETTER_ALIAS[L], urlForAudioKey(LETTER_ALIAS[L]));
    }
  }

  const words =
    tier === "full"
      ? Object.keys(phonicsMap).filter((k) => k.length <= 5 && !k.includes(" "))
      : CVC_WORDS;
  for (const w of words) {
    await addEntry("phonics-word", w, urlForAudioKey(w));
  }

  for (const line of COACH_LINES) {
    await addEntry("coach", line, urlForAudioKey(line.toLowerCase()) ?? urlForAudioKey(line));
  }

  const spellingWords = [...new Set([...SPELLING_SEED, ...CVC_WORDS])].slice(0, spellingLimit);
  for (const w of spellingWords) {
    await addEntry("spelling", w, urlForAudioKey(w));
  }

  const stats = validatePack();
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    tier,
    origin: ORIGIN,
    entries,
  };
  writeFileSync(join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(
    `Pack: ${ok} ok, ${fail} failed, ${Object.keys(entries).length} manifest keys, ` +
      `${stats.mp3Count} mp3, ${stats.uniqueHashes} unique → ${packRoot}`,
  );
  if (fail > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
