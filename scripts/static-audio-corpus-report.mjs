#!/usr/bin/env node
/**
 * Layer 2 progress — missing static-audio entries grouped by corpus source.
 * Usage: node scripts/static-audio-corpus-report.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_PATH = join(ROOT, "artifacts/kidschedule/src/data/static-audio-map.json");
const CORPUS_PATH = join(ROOT, "artifacts/kidschedule/src/data/speakable-phrase-corpus.json");

function normalizeKey(text) {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

const map = JSON.parse(readFileSync(MAP_PATH, "utf8"));
const mapNorm = new Set();
for (const bucket of ["default", "phonics"]) {
  for (const key of Object.keys(map[bucket] ?? {})) {
    mapNorm.add(`${bucket}\0${normalizeKey(key)}`);
  }
}

const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf8"));
const phrases = Array.isArray(corpus) ? corpus : corpus.phrases ?? [];

const bySource = new Map();
let missing = 0;

for (const p of phrases) {
  const mode = p.mode === "phonics" ? "phonics" : "default";
  const nk = p.normalizedKey ?? normalizeKey(p.text ?? "");
  if (!nk) continue;
  const hit = mapNorm.has(`${mode}\0${nk}`);
  const source = p.source ?? "unknown";
  if (!bySource.has(source)) bySource.set(source, { total: 0, missing: 0 });
  const row = bySource.get(source);
  row.total += 1;
  if (!hit) {
    row.missing += 1;
    missing += 1;
  }
}

const rows = [...bySource.entries()]
  .map(([source, { total, missing: m }]) => ({
    source,
    total,
    missing: m,
    pct: total ? Math.round(((total - m) / total) * 100) : 100,
  }))
  .sort((a, b) => b.missing - a.missing);

console.log(`Static audio corpus: ${phrases.length} phrases, ${missing} missing from map\n`);
for (const r of rows) {
  if (r.missing === 0) continue;
  console.log(`  ${r.source.padEnd(22)} ${String(r.missing).padStart(5)} missing / ${r.total}  (${r.pct}% covered)`);
}
if (missing === 0) {
  console.log("  100% coverage — Layer 2 complete.");
} else {
  console.log(`\nRun: pnpm run generate:static-audio  (or GitHub Actions → Generate static audio)`);
}
