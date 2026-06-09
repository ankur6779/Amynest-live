/**
 * Infant lullaby catalog — backed by GCS Rhymes/ library (172 production MP3s).
 * Playback uses signed URLs via /api/audio/signed-url/:audioId (no bundled assets).
 */
import { listRhymesRegistryEntries } from "@workspace/rhymes-audio";
import type { SleepAgeGroup, SleepIconName, SleepLibraryItem } from "./infant-sleep-catalog";

const ICON_CYCLE: SleepIconName[] = ["Star", "Moon", "Music", "Sparkles", "HeartIcon", "Cloud", "Bird"];

/** Legacy bundled ids → GCS registry ids (favorites / deep links). */
export const LULLABY_LEGACY_ID_ALIASES: Record<string, string> = {
  "lul-twinkle": "twinkle-twinkle-little-star",
  "lul-brahms": "brahms-lullaby",
  "lul-cradle-song": "cradle-song",
};

function pickIcon(id: string): SleepIconName {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ICON_CYCLE[Math.abs(h) % ICON_CYCLE.length]!;
}

function estimateDurationSec(sizeBytes: number): number {
  if (sizeBytes <= 0) return 180;
  return Math.max(90, Math.min(420, Math.round(sizeBytes / 14_000)));
}

function buildLullabyItem(
  entry: ReturnType<typeof listRhymesRegistryEntries>[number],
): SleepLibraryItem {
  const ageGroups: SleepAgeGroup[] = ["0-6m", "6-12m", "12-24m"];
  return {
    id: entry.id,
    title: entry.title.replace(/_+$/, "").trim(),
    category: "lullaby",
    ageGroups,
    primaryAgeGroup: "0-6m",
    icon: pickIcon(entry.id),
    durationSec: entry.durationSec ?? estimateDurationSec(entry.sizeBytes),
    offlineSuitability: "streaming",
    calmingIntensity: 1,
    loopRecommendation: "optional",
    packId: "none",
    tags: ["gcs", "rhymes"],
    gcsAudioId: entry.id,
  };
}

export const LULLABY_ITEMS: SleepLibraryItem[] = listRhymesRegistryEntries().map(buildLullabyItem);

export function resolveLullabyGcsAudioId(id: string): string | undefined {
  const trimmed = id.trim();
  const aliased = LULLABY_LEGACY_ID_ALIASES[trimmed] ?? trimmed;
  return LULLABY_ITEMS.find((i) => i.id === aliased)?.gcsAudioId ?? aliased;
}
