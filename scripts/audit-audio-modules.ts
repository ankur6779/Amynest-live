/**
 * Cross-module audio asset audit — static map, phonics library, corpus gaps.
 *
 *   pnpm --filter @workspace/scripts run audit-audio-modules
 */
import { readFileSync, existsSync } from "node:fs";
import {
  collectAllSpeakablePhrases,
  computeCorpusMissingStaticAudioKeys,
  normalizeStaticAudioKey,
} from "@workspace/static-audio";
import {
  buildPhonicsAudioCatalog,
  getPhonicsCatalogKey,
  getPhonicsCurriculumWordsForStaticCatalog,
  getPhonicsTestAudioEntriesForStaticCatalog,
} from "@workspace/phonics-sounds";
import { loadStaticAudioMap, REPO_ROOT } from "./static-audio-paths.js";

type ModuleAudit = {
  module: string;
  playback: string;
  corpusPhrases: number;
  staticMissing: number;
  phonicsLibraryMissing: number;
  samples: string[];
};

function loadPhonicsManifest(): { assets: Record<string, { url?: string }> } | null {
  const path = `${REPO_ROOT}/artifacts/kidschedule/src/data/phonics-audio-map.json`;
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as { assets: Record<string, { url?: string }> };
  } catch {
    return null;
  }
}

function staticHasPhrase(map: ReturnType<typeof loadStaticAudioMap>, text: string): boolean {
  const key = normalizeStaticAudioKey(text);
  if (!key) return false;
  return Boolean(map.default[key]?.startsWith("https://") || map.phonics[key]?.startsWith("https://"));
}

function auditModule(
  module: string,
  playback: string,
  phrases: string[],
  map: ReturnType<typeof loadStaticAudioMap>,
  phonicsManifest: ReturnType<typeof loadPhonicsManifest>,
): ModuleAudit {
  const staticMissing: string[] = [];
  const phonicsMissing: string[] = [];

  for (const text of phrases) {
    if (!staticHasPhrase(map, text)) staticMissing.push(text);
    if (phonicsManifest) {
      const catalog = buildPhonicsAudioCatalog().find(
        (e) => e.type === "cvc" && e.text.toLowerCase() === text.toLowerCase(),
      );
      if (catalog) {
        const key = getPhonicsCatalogKey(catalog.type, catalog.id);
        const asset = phonicsManifest.assets[key];
        if (!asset?.url?.startsWith("https://")) phonicsMissing.push(text);
      }
    }
  }

  return {
    module,
    playback,
    corpusPhrases: phrases.length,
    staticMissing: staticMissing.length,
    phonicsLibraryMissing: phonicsMissing.length,
    samples: [...new Set([...staticMissing, ...phonicsMissing])].slice(0, 12),
  };
}

const map = loadStaticAudioMap();
const corpus = collectAllSpeakablePhrases();
const corpusMissing = computeCorpusMissingStaticAudioKeys(map);
const phonicsManifest = loadPhonicsManifest();
const curriculumWords = getPhonicsCurriculumWordsForStaticCatalog();

const modules: ModuleAudit[] = [
  auditModule(
    "Amy Audio Lessons",
    "useAmyVoice + lessonParagraph",
    corpus.filter((p) => p.source.startsWith("audio_lessons")).map((p) => p.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Speech Coach",
    "useAmyVoice + coach audioIdentity",
    corpus
      .filter((p) => p.source.startsWith("speech_coach") || p.source === "coach_dialogue")
      .map((p) => p.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Smart Math Tricks",
    "useAmyVoice + catalogPlayback",
    corpus.filter((p) => p.source === "math_tricks").map((p) => p.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Phonics / Word Building",
    "AudioPlayButton + phonicsEngine",
    curriculumWords,
    map,
    phonicsManifest,
  ),
  auditModule(
    "Phonics Test",
    "useAmyVoice + phonicsEngine (quiz ttsText)",
    getPhonicsTestAudioEntriesForStaticCatalog().map((e) => e.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Spelling Mastery",
    "useSpelling + catalogPlayback",
    corpus.filter((p) => p.source === "spelling_mastery").map((p) => p.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Parent Hub",
    "useAmyVoice + parentHub",
    corpus.filter((p) => p.source === "parent_hub").map((p) => p.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Study Zone / Abacus",
    "useAmyVoice + catalogPlayback",
    corpus.filter((p) => p.source.startsWith("study_zone")).map((p) => p.text),
    map,
    phonicsManifest,
  ),
  auditModule(
    "Content Bank / Learning Zone",
    "AudioPlayButton + catalogPlayback",
    corpus.filter((p) => p.source === "content_bank").map((p) => p.text),
    map,
    phonicsManifest,
  ),
];

console.log("\n=== AmyNest Audio Module Audit ===\n");
console.log(`Corpus phrases: ${corpus.length}`);
console.log(`Corpus missing from static map: ${corpusMissing.length}`);
if (corpusMissing.length > 0) {
  console.log("  sample:", corpusMissing.slice(0, 15).join(", "));
}
console.log(`Phonics curriculum words tracked: ${curriculumWords.length}`);
console.log(`Phonics library catalog size: ${buildPhonicsAudioCatalog().length}`);
console.log("");

for (const m of modules) {
  const ok = m.staticMissing === 0 && m.phonicsLibraryMissing === 0;
  console.log(`${ok ? "✔" : "✗"} ${m.module}`);
  console.log(`    playback: ${m.playback}`);
  console.log(`    phrases: ${m.corpusPhrases} | static missing: ${m.staticMissing} | phonics lib missing: ${m.phonicsLibraryMissing}`);
  if (m.samples.length > 0) console.log(`    gaps: ${m.samples.join(", ")}`);
  console.log("");
}

const totalStaticGaps = corpusMissing.length;
const phonicsGaps = curriculumWords.filter((w) => !staticHasPhrase(map, w));
const libGaps = curriculumWords.filter((w) => {
  const catalog = buildPhonicsAudioCatalog().find((e) => e.type === "cvc" && e.text === w);
  if (!catalog || !phonicsManifest) return false;
  const key = getPhonicsCatalogKey(catalog.type, catalog.id);
  return !phonicsManifest.assets[key]?.url?.startsWith("https://");
});

console.log("=== Generation targets ===");
console.log(`Static-audio to generate: ${totalStaticGaps} corpus + ${phonicsGaps.length} curriculum word gaps`);
if (phonicsGaps.length) console.log("  curriculum:", phonicsGaps.join(", "));
console.log(`Phonics library to generate: ${libGaps.length} new CVC entries`);
if (libGaps.length) console.log("  words:", libGaps.join(", "));

if (totalStaticGaps > 0 || phonicsGaps.length > 0 || libGaps.length > 0) {
  process.exitCode = 1;
}
