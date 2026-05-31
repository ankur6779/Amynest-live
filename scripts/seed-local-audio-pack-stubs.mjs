#!/usr/bin/env node
/**
 * Offline dev/CI stubs when GCS download is unavailable.
 * Copies a small valid MP3 into the pack layout + manifest.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packRoot = join(repoRoot, "artifacts/kidschedule/public/audio-pack");
const templateMp3 = join(
  repoRoot,
  "artifacts/api-server/data/tts-cache/f7a3ec14c0442009f65da6e3e456347702eb5826b9c654facb465ded94199e23.mp3",
);

const LETTER_ALIAS = {
  a: "a as in apple",
  e: "e as in egg",
  i: "i as in igloo",
  o: "o as in octopus",
  u: "u as in umbrella",
};

const CVC = [
  "cat", "bat", "mat", "sat", "pat", "dog", "log", "fog", "pen", "hen", "ten",
  "sit", "hit", "cup", "sun", "hat", "rat", "pig", "bed", "bus",
];

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const COACH = ["Good job!", "Try again", "Well done", "Listen carefully", "Great job!"];
const SPELLING = [...new Set([...CVC, "run", "fun", "red", "big", "jam"])];

function slug(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function copyStub(category, id) {
  const file = `${category}/${slug(id)}.mp3`;
  const dest = join(packRoot, file);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(templateMp3, dest);
  return file;
}

if (!existsSync(templateMp3)) {
  console.error("Missing template mp3:", templateMp3);
  process.exit(1);
}

const entries = {};

for (const L of LETTERS) {
  const f = copyStub("phonics-letter", L);
  entries[`phonics-letter:${L}`] = f;
  if (LETTER_ALIAS[L]) {
    const fa = copyStub("phonics-letter", LETTER_ALIAS[L]);
    entries[`phonics-letter:${LETTER_ALIAS[L]}`] = fa;
  }
}

for (const w of CVC) {
  const f = copyStub("phonics-word", w);
  entries[`phonics-word:${w}`] = f;
}

for (const line of COACH) {
  const f = copyStub("coach", line);
  entries[`coach:${line}`] = f;
  entries[`coach:${line.toLowerCase()}`] = f;
}

for (const w of SPELLING) {
  const f = copyStub("spelling", w);
  entries[`spelling:${w}`] = f;
}

writeFileSync(
  join(packRoot, "manifest.json"),
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      tier: "stub",
      entries,
    },
    null,
    2,
  ),
);

console.log(`Seeded ${Object.keys(entries).length} stub entries under ${packRoot}`);
