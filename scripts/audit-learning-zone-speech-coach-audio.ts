/**
 * Section-by-section Learning Zone + Speech Coach static audio map audit.
 *
 *   pnpm --filter @workspace/scripts exec tsx ./audit-learning-zone-speech-coach-audio.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  collectAllSpeakablePhrases,
  normalizeStaticAudioKey,
  type SpeakablePhraseRecord,
} from "@workspace/static-audio";
import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import { getAllCatalogEntries } from "@workspace/spelling-catalog";
import { SPELLING_AUDIO_MANIFEST_PATHS } from "./spelling-audio-io.js";
import { loadStaticAudioMap, REPO_ROOT } from "./static-audio-paths.js";

const map = loadStaticAudioMap();

function has(text: string, mode: "default" | "phonics"): boolean {
  const k = normalizeStaticAudioKey(text);
  if (mode === "phonics") return Boolean(map.phonics[k]);
  return Boolean(map.default[k]);
}

function bucket(source: string): string {
  if (source.startsWith("study_zone")) return "study_zone";
  if (source.startsWith("speech_coach") || source === "coach_dialogue") return "speech_coach";
  if (source.startsWith("audio_lessons")) return "audio_lessons";
  if (source === "phonics_sounds") return "phonics_static_tts";
  if (source === "spelling_mastery") return "spelling_mastery";
  if (source === "math_tricks") return "math_tricks";
  if (source === "content_bank") return "content_bank";
  if (source === "static_catalog" || source === "extra_default") return "shared_ui_phrases";
  return "other";
}

function summarize(records: SpeakablePhraseRecord[]) {
  const missing = records.filter((r) => !has(r.text, r.mode));
  return {
    total: records.length,
    mapped: records.length - missing.length,
    missing: missing.length,
    ...(missing.length > 0
      ? { unmappedSample: missing.slice(0, 3).map((r) => r.text.slice(0, 100)) }
      : {}),
  };
}

const all = collectAllSpeakablePhrases();
const byBucket = new Map<string, SpeakablePhraseRecord[]>();
for (const r of all) {
  const b = bucket(r.source);
  const list = byBucket.get(b) ?? [];
  list.push(r);
  byBucket.set(b, list);
}

// Spelling uses a dedicated GCS manifest (not static-audio-map.json).
let spellingManifest: { catalog: number; manifest: number; withUrl: number; missingUrl: number } | null =
  null;
try {
  const path = SPELLING_AUDIO_MANIFEST_PATHS[0];
  if (existsSync(path)) {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      entries?: Record<string, { url?: string }>;
    };
    const entries = Object.entries(raw.entries ?? {});
    spellingManifest = {
      catalog: getAllCatalogEntries().length,
      manifest: entries.length,
      withUrl: entries.filter(([, v]) => (v.url ?? "").trim()).length,
      missingUrl: entries.filter(([, v]) => !(v.url ?? "").trim()).length,
    };
  }
} catch {
  spellingManifest = { catalog: 0, manifest: 0, withUrl: 0, missingUrl: -1 };
}

const learningZoneBuckets = [
  "study_zone",
  "audio_lessons",
  "phonics_static_tts",
  "math_tricks",
  "content_bank",
] as const;

const report: Record<string, ReturnType<typeof summarize>> = {};
for (const b of learningZoneBuckets) {
  report[b] = summarize(byBucket.get(b) ?? []);
}
report.speech_coach = summarize(byBucket.get("speech_coach") ?? []);

const warmup = getCoachDialogueWarmupPhrases();
report.speech_coach_warmup = {
  total: warmup.length,
  mapped: warmup.filter((t) => has(t, "default")).length,
  missing: warmup.filter((t) => !has(t, "default")).length,
};

// Phonics curated manifest (ElevenLabs / local MP3 — separate from OpenAI static map)
let phonicsManifest: { total: number; withUrl: number; missingUrl: number } | null = null;
try {
  const raw = JSON.parse(
    readFileSync(join(REPO_ROOT, "artifacts/kidschedule/src/data/phonics-audio-map.json"), "utf8"),
  ) as { assets?: Record<string, { url?: string }> };
  const assets = Object.entries(raw.assets ?? {});
  phonicsManifest = {
    total: assets.length,
    withUrl: assets.filter(([, v]) => (v.url ?? "").trim()).length,
    missingUrl: assets.filter(([, v]) => !(v.url ?? "").trim()).length,
  };
} catch {
  phonicsManifest = { total: 0, withUrl: 0, missingUrl: -1 };
}

console.log(
  JSON.stringify(
    {
      learning_zone: report,
      spelling_dedicated_manifest: spellingManifest,
      phonics_curated_manifest: phonicsManifest,
    },
    null,
    2,
  ),
);

const staticMapMissing = Object.values(report).reduce((n, s) => n + s.missing, 0);
const spellingMissing = spellingManifest?.missingUrl ?? 0;
const phonicsManifestMissing = phonicsManifest?.missingUrl ?? 0;

if (staticMapMissing > 0 || spellingMissing > 0 || phonicsManifestMissing > 0) process.exit(1);
