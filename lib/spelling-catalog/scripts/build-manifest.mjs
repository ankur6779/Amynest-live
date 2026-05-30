/**
 * Builds static spelling manifest JSON + TypeScript index from word seeds.
 * Run: node lib/spelling-catalog/scripts/build-manifest.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dir, "..");
const repoRoot = join(pkgRoot, "..", "..");

// Load compiled seeds via dynamic import of TS — use node with type stripping if available,
// otherwise import pre-built word list JSON.
const seedsPath = join(pkgRoot, "src", "seeds", "word-banks.ts");

async function loadSeeds() {
  try {
    const mod = await import(pathToFileURL(seedsPath).href);
    return mod.WORD_SEEDS;
  } catch {
    // Fallback: run via ts-node alternative — load from committed seed snapshot
    const snap = join(pkgRoot, "seeds", "word-seeds.snapshot.json");
    return JSON.parse(readFileSync(snap, "utf8"));
  }
}

const DIGRAPHS = ["sh", "ch", "th", "ph", "wh", "ck", "ng", "qu", "ee", "ea", "oo", "ai", "ay", "oa", "ou", "ow", "oi", "oy", "ar", "er", "ir", "or", "ur"];
const AGE_GROUPS = ["2-4", "4-6", "6-8", "8-10+"];
const DIFFICULTIES = ["easy", "medium", "hard"];

function splitSyllables(word) {
  const w = word.toLowerCase();
  if (w.length <= 3) return [w];
  const parts = [];
  let i = 0;
  while (i < w.length) {
    let best = 1;
    for (const dg of DIGRAPHS) {
      if (w.slice(i, i + dg.length) === dg) best = Math.max(best, dg.length);
    }
    const chunk = w.slice(i, i + Math.min(best + 1, w.length - i));
    parts.push(chunk);
    i += chunk.length;
    if (parts.length >= 4) break;
  }
  if (i < w.length) parts.push(w.slice(i));
  return parts.length > 0 ? parts : [w];
}

function splitSounds(word) {
  const w = word.toLowerCase();
  const sounds = [];
  let i = 0;
  while (i < w.length) {
    let matched = false;
    for (const dg of [...DIGRAPHS].sort((a, b) => b.length - a.length)) {
      if (w.slice(i, i + dg.length) === dg) {
        sounds.push(dg);
        i += dg.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      sounds.push(w[i]);
      i += 1;
    }
  }
  return sounds;
}

function inferPhonicsTags(word, sounds) {
  const tags = new Set();
  const w = word.toLowerCase();
  if (w.length <= 3 && sounds.length === w.length) tags.add("cvc");
  if (sounds.some((s) => DIGRAPHS.includes(s))) tags.add("digraph");
  if (/^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw)/.test(w)) tags.add("blend");
  if (w.endsWith("ing")) tags.add("suffix-ing");
  if (w.length >= 8) tags.add("multisyllable");
  if (tags.size === 0) tags.add("phonics");
  return [...tags];
}

function masteryLevelForRank(rank, total, difficulty) {
  const base = difficulty === "easy" ? 1 : difficulty === "medium" ? 8 : 18;
  const span = difficulty === "easy" ? 14 : difficulty === "medium" ? 22 : 32;
  const t = total <= 1 ? 0 : rank / (total - 1);
  return Math.min(50, Math.max(1, Math.round(base + t * span)));
}

function enrichWord(word, ageGroup, difficulty, rank, total) {
  const w = word.toLowerCase().trim();
  const sounds = splitSounds(w);
  return {
    id: `${ageGroup}:${difficulty}:${w}`,
    word: w,
    ageGroup,
    difficulty,
    meaning: `A spelling word: ${w}.`,
    syllables: splitSyllables(w),
    sounds,
    sentence: `I can spell ${w}.`,
    phonicsTags: inferPhonicsTags(w, sounds),
    masteryLevel: masteryLevelForRank(rank, total, difficulty),
  };
}

function bucketKey(ageGroup, difficulty) {
  return `${ageGroup}:${difficulty}`;
}

const WORD_SEEDS = await loadSeeds();
const dataDir = join(pkgRoot, "data");
mkdirSync(dataDir, { recursive: true });

const buckets = {};
const bucketCounts = {};

for (const age of AGE_GROUPS) {
  for (const diff of DIFFICULTIES) {
    const seeds = WORD_SEEDS[age][diff];
    const total = seeds.length;
    const entries = seeds.map((word, rank) => enrichWord(word, age, diff, rank, total));
    const key = bucketKey(age, diff);
    buckets[key] = entries;
    bucketCounts[key] = entries.length;
  }
}

const manifest = {
  meta: {
    version: 1,
    generatedAt: new Date().toISOString(),
    bucketCounts,
  },
  buckets,
};

const manifestPath = join(dataDir, "manifest.json");
writeFileSync(manifestPath, JSON.stringify(manifest));

const totalWords = Object.values(bucketCounts).reduce((a, b) => a + b, 0);
console.log(`Wrote ${manifestPath} (${totalWords} words)`);

writeFileSync(
  join(dataDir, "index.ts"),
  `/** Auto-generated — do not edit. */
import type { SpellingManifest } from "../src/types.js";
import manifestJson from "./manifest.json" with { type: "json" };

export const SPELLING_MANIFEST: SpellingManifest = manifestJson as SpellingManifest;
export const SPELLING_MANIFEST_VERSION = ${manifest.meta.version};
`,
);
