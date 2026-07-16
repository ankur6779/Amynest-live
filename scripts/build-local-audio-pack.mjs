#!/usr/bin/env node
/**
 * Build bundled recovery clips into kidschedule/public/audio-pack (release / CI).
 *
 *   node scripts/build-local-audio-pack.mjs [--tier minimal|core|full] [--spelling-limit N] [--force]
 *
 * Downloads via production static-audio API (GCS is not public). Validates unique clips.
 *
 * Tiers:
 *   minimal — letters + digraphs + ~20 CVC + coach lines + spelling seed (~3MB)
 *   core    — production hot pack: letters, phonemes, numbers, colors, animals,
 *             shapes, common words, spelling starters, feedback UI (~20–40MB target)
 *   full    — broader phonics map + up to spelling-limit words
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

const tierArg = process.argv.includes("--tier")
  ? process.argv[process.argv.indexOf("--tier") + 1]
  : "minimal";
const tier = ["minimal", "core", "full"].includes(tierArg) ? tierArg : "minimal";
const force = process.argv.includes("--force");
const spellingLimit = Number(
  process.argv.includes("--spelling-limit")
    ? process.argv[process.argv.indexOf("--spelling-limit") + 1]
    : tier === "full"
      ? 500
      : tier === "core"
        ? 200
        : 60,
);

const staticMap = JSON.parse(readFileSync(staticMapPath, "utf8"));
const defaultMap = staticMap.default ?? {};
const phonicsMap = staticMap.phonics ?? {};
const audioUrlMap = { ...defaultMap, ...phonicsMap };

// Phonics library manifest (pure phonemes) — the ONLY valid source for letter /
// digraph clips. The static map's "a as in apple" clips are letter-name audio
// and must never be bundled as phonics-letter assets.
const phonicsLibraryMapPath = join(
  repoRoot,
  "artifacts/kidschedule/src/data/phonics-audio-map.json",
);
const phonicsLibrary = JSON.parse(readFileSync(phonicsLibraryMapPath, "utf8"));
const PHONEME_KEY_ALIAS = { th: "th1" };

function phonemeUrlForLetter(key) {
  const id = PHONEME_KEY_ALIAS[key] ?? key;
  const asset =
    phonicsLibrary.assets?.[`letter:${id}`] ?? phonicsLibrary.assets?.[`digraph:${id}`];
  if (!asset?.url) return null;
  // Version-bust shared HTTP/CDN caches so we never bundle stale bytes.
  const v = asset.checksum?.slice(0, 8) ?? asset.version ?? null;
  return v ? `${asset.url}?v=${v}` : asset.url;
}

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

const DIGRAPHS = ["sh", "ch", "th", "ng", "wh", "ck", "qu"];

const CVC_WORDS = [
  "cat", "bat", "mat", "sat", "pat", "dog", "log", "fog", "pen", "hen", "ten",
  "sit", "hit", "cup", "sun", "hat", "rat", "pig", "bed", "bus", "run", "fun",
  "jam", "map", "tap", "red", "big", "box", "fox", "mop", "top", "hop", "pop",
  "net", "wet", "jet", "leg", "peg", "mug", "bug", "rug", "hug", "cut", "nut",
  "fin", "pin", "win", "bin", "lip", "zip", "kid", "lid", "mad", "sad", "dad",
];

const NUMBERS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty",
];

const COLORS = [
  "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white",
];

const ANIMALS = [
  "cat", "dog", "pig", "hen", "cow", "duck", "fish", "bird", "lion", "bear", "frog",
];

const SHAPES = [
  "circle", "square", "triangle", "rectangle", "star", "heart", "oval",
];

const COMMON_WORDS = [
  "apple", "ball", "book", "car", "home", "water", "food", "milk", "baby", "mom",
  "dad", "yes", "no", "hello", "goodbye", "please", "thank you", "sorry", "love",
  "happy", "sad", "big", "small", "hot", "cold", "up", "down", "in", "out",
  "go", "stop", "look", "listen", "say", "read", "write", "count", "draw",
];

const FEEDBACK_LINES = [
  "try again",
  "great job!",
  "good job!",
  "well done",
  "nice try.",
  "that was excellent.",
  "listen carefully",
  "your turn.",
  "let's begin!",
  "ready? let's start!",
  "take your time.",
  "let's try together.",
  "let's try again",
  "not quite — try again!",
  "great work today!",
  "correct! well done!",
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
  "box", "fox", "mop", "top", "net", "wet", "leg", "mug", "bug", "cut", "nut", "fin",
  "pin", "win", "lip", "zip", "kid", "mad", "sad", "dad", "mom", "yes", "no", "go",
  "up", "in", "out", "hot", "cold", "book", "ball", "car", "fish", "bird", "frog",
  "lion", "bear", "duck", "cow", "apple", "water", "milk", "baby", "love", "happy",
];

const LESSON_INTROS = [
  "let's begin!",
  "ready? let's start!",
  "listen carefully",
  "your turn.",
  "take your time.",
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

function isPhonicsLibraryProxyUrl(url) {
  return /\/api\/phonics-library\/phonics\/[a-z0-9_-]+\/[a-z0-9_.%-]+\.mp3(\?[^#]*)?$/i.test(
    String(url ?? "").trim(),
  );
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
  if (existsSync(destPath) && !force) {
    const buf = readFileSync(destPath);
    if (buf.length >= 512 && buf.length < 200_000) return true;
  }

  let apiUrl = null;
  const hash = hashFromGcsUrl(gcsUrl);
  if (hash) {
    apiUrl = `${ORIGIN}/api/static-audio/${hash}.mp3`;
  } else if (isPhonicsLibraryProxyUrl(gcsUrl)) {
    const path = String(gcsUrl).startsWith("http")
      ? new URL(gcsUrl).pathname
      : String(gcsUrl);
    apiUrl = `${ORIGIN}${path}`;
  } else if (String(gcsUrl).startsWith("http")) {
    apiUrl = gcsUrl;
  } else {
    return false;
  }

  let res = await fetch(apiUrl);
  if (!res.ok && hash) {
    res = await fetch(gcsUrl);
  }
  if (!res.ok) return false;

  const buf = Buffer.from(await res.arrayBuffer());
  // Reject placeholder / corrupt clips (<2KB typical stub)
  if (buf.length < 2000) return false;

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
  let totalBytes = 0;
  for (const name of readdirSync(packRoot)) {
    const p = join(packRoot, name);
    if (!statSync(p).isDirectory()) continue;
    for (const fn of readdirSync(p)) {
      if (!fn.endsWith(".mp3")) continue;
      mp3Count += 1;
      const buf = readFileSync(join(p, fn));
      totalBytes += buf.length;
      const h = createHash("sha256").update(buf).digest("hex");
      hashes.set(h, (hashes.get(h) ?? 0) + 1);
    }
  }
  const unique = hashes.size;
  const maxDup = Math.max(0, ...hashes.values());
  const minFiles = tier === "core" ? 120 : 40;
  if (mp3Count < minFiles) {
    throw new Error(`Pack too small: ${mp3Count} mp3 files (need >= ${minFiles} for tier=${tier})`);
  }
  if (unique < Math.min(30, Math.floor(mp3Count * 0.5))) {
    throw new Error(
      `Pack looks like stubs: ${unique} unique hashes across ${mp3Count} files (max dup ${maxDup})`,
    );
  }
  return { mp3Count, uniqueHashes: unique, totalBytes };
}

async function main() {
  mkdirSync(packRoot, { recursive: true });
  if (force) clearStubMp3s();

  const letters =
    tier === "full"
      ? Object.keys(phonicsMap).length > 0
        ? Object.keys(phonicsMap)
        : [..."abcdefghijklmnopqrstuvwxyz".split(""), ...DIGRAPHS]
      : [..."abcdefghijklmnopqrstuvwxyz".split(""), ...(tier === "core" ? DIGRAPHS : ["sh", "ch", "th", "ng"])];

  for (const L of letters) {
    // Pure phoneme from the phonics library — never the "as in"/letter-name clips.
    const url = phonemeUrlForLetter(L) ?? urlForAudioKey(L);
    await addEntry("phonics-letter", L, url);
    if (LETTER_ALIAS[L]) {
      // Alias key ("a as in apple") points at the same pure phoneme clip so any
      // legacy lookup path still hears the phoneme, not the letter name.
      const file = `phonics-letter/${slug(L)}.mp3`;
      if (entries[`phonics-letter:${L}`]) {
        entries[`phonics-letter:${LETTER_ALIAS[L]}`] = file;
      }
    }
  }

  const words =
    tier === "full"
      ? Object.keys(phonicsMap).filter((k) => k.length <= 5 && !k.includes(" "))
      : tier === "core"
        ? [...new Set([...CVC_WORDS, ...COMMON_WORDS, ...ANIMALS])]
        : CVC_WORDS;
  for (const w of words) {
    await addEntry("phonics-word", w, urlForAudioKey(w));
  }

  if (tier === "core" || tier === "full") {
    for (const n of NUMBERS) {
      await addEntry("phonics-word", n, urlForAudioKey(n));
    }
    for (const c of COLORS) {
      await addEntry("phonics-word", c, urlForAudioKey(c));
    }
    for (const s of SHAPES) {
      await addEntry("phonics-word", s, urlForAudioKey(s));
    }
  }

  for (const line of COACH_LINES) {
    await addEntry("coach", line, urlForAudioKey(line.toLowerCase()) ?? urlForAudioKey(line));
  }

  if (tier === "core" || tier === "full") {
    for (const line of FEEDBACK_LINES) {
      await addEntry("coach", line, urlForAudioKey(line.toLowerCase()) ?? urlForAudioKey(line));
    }
    for (const line of LESSON_INTROS) {
      await addEntry("coach", line, urlForAudioKey(line.toLowerCase()) ?? urlForAudioKey(line));
    }
  }

  const spellingWords = [
    ...new Set([...SPELLING_SEED, ...CVC_WORDS, ...(tier === "core" ? COMMON_WORDS : [])]),
  ].slice(0, spellingLimit);
  for (const w of spellingWords) {
    await addEntry("spelling", w, urlForAudioKey(w));
  }

  // Core pack: pull additional high-frequency short catalog keys (fruits, animals, UI)
  // so the hot pack approaches the 20–40MB production budget without bundling the full library.
  if (tier === "core" || tier === "full") {
    const EXTRA_CORE = [
      "horse", "tiger", "elephant", "monkey", "rabbit",
      "banana", "mango", "grapes", "strawberry", "watermelon", "pineapple", "bread", "rice",
      "amazing!", "keep going!", "nice work!", "your turn!", "diamond",
      "meow", "moo", "woof", "quack", "roar!",
    ];
    for (const w of EXTRA_CORE) {
      await addEntry("phonics-word", w, urlForAudioKey(w));
    }
    // Auto-fill: short default-map keys not already covered (cap to stay under ~40MB).
    const already = new Set(Object.keys(entries).map((k) => k.split(":").slice(1).join(":").toLowerCase()));
    const autoKeys = Object.keys(defaultMap)
      .filter((k) => {
        const t = k.trim().toLowerCase();
        if (already.has(t)) return false;
        if (t.length > 24) return false;
        if (t.split(/\s+/).length > 4) return false;
        return Boolean(defaultMap[k]);
      })
      .slice(0, tier === "full" ? 800 : 350);
    for (const k of autoKeys) {
      await addEntry("phonics-word", k, urlForAudioKey(k));
    }
  }

  const stats = validatePack();
  const sizeMb = (stats.totalBytes / (1024 * 1024)).toFixed(1);
  const manifest = {
    version: tier === "core" ? 2 : 1,
    generatedAt: new Date().toISOString(),
    tier,
    origin: ORIGIN,
    sizeBytes: stats.totalBytes,
    entries,
  };
  writeFileSync(join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(
    `Pack: tier=${tier} ${ok} ok, ${fail} failed, ${Object.keys(entries).length} manifest keys, ` +
      `${stats.mp3Count} mp3, ${stats.uniqueHashes} unique, ${sizeMb}MB → ${packRoot}`,
  );
  // Soft-fail: missing catalog keys are expected; hard-fail only if pack is unusable.
  const failRatio = ok + fail === 0 ? 1 : fail / (ok + fail);
  if (failRatio > 0.55 && ok < 80) {
    console.error(`Pack coverage too low: ok=${ok} fail=${fail}`);
    process.exitCode = 1;
  } else if (fail > 0) {
    console.warn(`Warning: ${fail} clips missing from static map (pack still usable).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
