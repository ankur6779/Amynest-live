import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import {
  ALL_DAILY_STORIES,
  buildDailyStorySpeakText,
} from "@workspace/parent-hub-speak";
import { getStaticAudioHash } from "@workspace/static-audio";
import { getPlayItemSpeakText, PLAY_CATEGORIES } from "@workspace/study-zone";
import {
  getWorldManifestGcsPath,
  type WorldManifest,
  WORLD_IDS,
  type WorldId,
} from "@workspace/world-engine";
import { logger } from "../../lib/logger.js";
import { generateAndPersistStaticPhrase } from "../staticAudioGeneration.js";
import { readGcsObjectBytes, readStaticAudioFromGcs, MIN_TTS_BYTES } from "../ttsAudioStore.js";
import { getSpellingGcsObjectPath } from "@workspace/spelling-audio";
import { runStaticAudioGenerate } from "./static-audio-runners.js";

export type AudioWarmupModule =
  | "stories"
  | "rhymes"
  | "speech_coach"
  | "spelling"
  | "discovery_world"
  | "animal_world"
  | "study_zone"
  | "parent_hub";

export const AUDIO_WARMUP_MODULE_CAPS: Record<AudioWarmupModule, number> = {
  stories: 5,
  speech_coach: 12,
  spelling: 12,
  study_zone: 8,
  rhymes: 8,
  animal_world: 16,
  discovery_world: 20,
  parent_hub: 10,
};

export type AudioWarmupInput = {
  module: AudioWarmupModule;
  maxAssets?: number;
  hints?: {
    spellingWords?: string[];
    storyIds?: string[];
    discoveryWorldId?: string;
    animalCategory?: string;
    studyTexts?: string[];
    ageMonths?: number;
  };
};

export type AudioWarmupResult = {
  ok: true;
  module: AudioWarmupModule;
  requested: number;
  verified: number;
  generated: number;
  failed: number;
  cdnWarmed: number;
};

type StaticPhrase = { text: string; mode: "default" | "phonics" };

function cap(module: AudioWarmupModule, maxAssets?: number): number {
  const limit = AUDIO_WARMUP_MODULE_CAPS[module];
  if (maxAssets == null) return limit;
  return Math.min(Math.max(0, maxAssets), limit);
}

function storyPhrases(limit: number, storyIds?: string[]): StaticPhrase[] {
  const pool = storyIds?.length
    ? ALL_DAILY_STORIES.filter((s) => storyIds.includes(s.id))
    : ALL_DAILY_STORIES;
  return pool.slice(0, limit).map((story) => ({
    text: buildDailyStorySpeakText(story),
    mode: "default" as const,
  }));
}

function coachPhrases(limit: number): StaticPhrase[] {
  return getCoachDialogueWarmupPhrases()
    .slice(0, limit)
    .map((text) => ({ text, mode: "default" as const }));
}

function rhymePhrases(limit: number): StaticPhrase[] {
  const rhymes = PLAY_CATEGORIES.find((c) => c.id === "rhymes");
  if (!rhymes) return [];
  return rhymes.items
    .slice(0, limit)
    .map((item) => ({
      text: getPlayItemSpeakText(item, "rhymes"),
      mode: "default" as const,
    }))
    .filter((p) => p.text.length >= 2);
}

function studyZonePhrases(limit: number, studyTexts?: string[]): StaticPhrase[] {
  if (studyTexts?.length) {
    return studyTexts
      .slice(0, limit)
      .map((text) => ({ text: text.trim(), mode: "default" as const }))
      .filter((p) => p.text.length >= 2);
  }
  const out: StaticPhrase[] = [];
  for (const cat of PLAY_CATEGORIES) {
    for (const item of cat.items) {
      const text = getPlayItemSpeakText(item, cat.id);
      if (text.length < 2) continue;
      out.push({ text, mode: "default" });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

async function warmStaticPhrases(phrases: StaticPhrase[]): Promise<{
  verified: number;
  generated: number;
  failed: number;
  cdnWarmed: number;
}> {
  let verified = 0;
  let generated = 0;
  let failed = 0;
  let cdnWarmed = 0;

  for (const { text, mode } of phrases) {
    const hash = getStaticAudioHash(text, mode);
    const existing = await readStaticAudioFromGcs(hash).catch(() => null);
    if (existing && existing.byteLength >= MIN_TTS_BYTES) {
      verified += 1;
      cdnWarmed += 1;
      continue;
    }

    const buffer = await generateAndPersistStaticPhrase(text, mode, "audio_warmup");
    if (buffer && buffer.byteLength >= MIN_TTS_BYTES) {
      generated += 1;
      cdnWarmed += 1;
      continue;
    }

    const raced = await readStaticAudioFromGcs(hash).catch(() => null);
    if (raced && raced.byteLength >= MIN_TTS_BYTES) {
      verified += 1;
      cdnWarmed += 1;
      continue;
    }

    const worker = await runStaticAudioGenerate({ text, mode, source: "audio_warmup" });
    if (worker?.bytes && worker.bytes >= MIN_TTS_BYTES) {
      generated += 1;
      cdnWarmed += 1;
    } else {
      failed += 1;
    }
  }

  return { verified, generated, failed, cdnWarmed };
}

async function warmLibraryPaths(paths: string[]): Promise<{
  verified: number;
  generated: number;
  failed: number;
  cdnWarmed: number;
}> {
  let verified = 0;
  let failed = 0;

  for (const objectPath of paths) {
    const buf = await readGcsObjectBytes(objectPath).catch(() => null);
    if (buf && buf.byteLength >= MIN_TTS_BYTES) {
      verified += 1;
    } else {
      failed += 1;
      logger.warn(
        { evt: "audio_warmup.library_miss", objectPath },
        "library asset missing — worker cannot synthesize",
      );
    }
  }

  return { verified, generated: 0, failed, cdnWarmed: verified };
}

function loadAnimalManifestAssets(): Array<{ gcsPath?: string }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../../../lib/animal-world/src/audio-manifest.json"),
    resolve(process.cwd(), "lib/animal-world/src/audio-manifest.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      assets?: Record<string, { gcsPath?: string }>;
    };
    return Object.values(raw.assets ?? {});
  }
  return [];
}

function resolveAnimalPaths(category: string | undefined, limit: number): string[] {
  const paths: string[] = [];
  for (const asset of loadAnimalManifestAssets()) {
    const p = asset.gcsPath?.trim();
    if (!p) continue;
    if (category && !p.includes(`animal-world/${category}/`)) continue;
    paths.push(p);
    if (paths.length >= limit) break;
  }
  return paths;
}

async function loadDiscoverySoundPaths(worldId: WorldId, limit: number): Promise<string[]> {
  const manifestPath = getWorldManifestGcsPath(worldId);
  const buf = await readGcsObjectBytes(manifestPath).catch(() => null);
  if (!buf?.byteLength) return [];

  let manifest: WorldManifest;
  try {
    manifest = JSON.parse(buf.toString("utf8")) as WorldManifest;
  } catch {
    return [];
  }

  const paths: string[] = [];
  for (const item of manifest.items ?? []) {
    for (const sound of item.sounds ?? []) {
      const p = sound.gcsPath?.trim();
      if (p) paths.push(p);
      if (paths.length >= limit) return paths;
    }
    const intro = item.narration?.introGcsPath?.trim();
    const cue = item.narration?.soundCueGcsPath?.trim();
    if (intro) paths.push(intro);
    if (cue) paths.push(cue);
    if (paths.length >= limit) return paths.slice(0, limit);
  }
  return paths.slice(0, limit);
}

async function resolveDiscoveryPaths(worldId: string | undefined, limit: number): Promise<string[]> {
  const targets = worldId
    ? ([worldId] as WorldId[])
    : (WORLD_IDS.filter((id) => id !== "animal_world") as WorldId[]);

  const paths: string[] = [];
  for (const id of targets) {
    const chunk = await loadDiscoverySoundPaths(id, limit - paths.length);
    paths.push(...chunk);
    if (paths.length >= limit) break;
  }
  return paths.slice(0, limit);
}

export async function runAudioWarmup(input: AudioWarmupInput): Promise<AudioWarmupResult> {
  const limit = cap(input.module, input.maxAssets);
  const hints = input.hints ?? {};

  let phrases: StaticPhrase[] = [];
  let libraryPaths: string[] = [];

  switch (input.module) {
    case "stories":
      phrases = storyPhrases(limit, hints.storyIds);
      break;
    case "speech_coach":
      phrases = coachPhrases(limit);
      break;
    case "spelling":
      libraryPaths = (hints.spellingWords?.length
        ? hints.spellingWords
        : ["cat", "dog", "sun", "hat", "run", "bed", "pig", "bus"]
      )
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, limit)
        .map((word) => getSpellingGcsObjectPath(word));
      break;
    case "rhymes":
      phrases = rhymePhrases(limit);
      break;
    case "study_zone":
      phrases = studyZonePhrases(limit, hints.studyTexts);
      break;
    case "parent_hub":
      phrases = storyPhrases(Math.min(5, limit), hints.storyIds);
      break;
    case "animal_world":
      libraryPaths = resolveAnimalPaths(hints.animalCategory, limit);
      break;
    case "discovery_world":
      libraryPaths = await resolveDiscoveryPaths(hints.discoveryWorldId, limit);
      break;
    default:
      phrases = [];
  }

  const staticResult = phrases.length
    ? await warmStaticPhrases(phrases)
    : { verified: 0, generated: 0, failed: 0, cdnWarmed: 0 };

  const libraryResult = libraryPaths.length
    ? await warmLibraryPaths(libraryPaths)
    : { verified: 0, generated: 0, failed: 0, cdnWarmed: 0 };

  return {
    ok: true,
    module: input.module,
    requested: phrases.length + libraryPaths.length,
    verified: staticResult.verified + libraryResult.verified,
    generated: staticResult.generated + libraryResult.generated,
    failed: staticResult.failed + libraryResult.failed,
    cdnWarmed: staticResult.cdnWarmed + libraryResult.cdnWarmed,
  };
}
