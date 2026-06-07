import { ALL_POEMS } from "@/data/infant-poems";
import { getSleepItemById, type SleepLibraryItem } from "@/data/infant-sleep-catalog";

/** Resolve catalog items, poems, and white-noise ids for favorites/recent rows. */
export function resolveSleepLibraryEntry(id: string): SleepLibraryItem | undefined {
  const direct = getSleepItemById(id);
  if (direct) return direct;

  const poem = ALL_POEMS.find((p) => p.id === id);
  if (poem) {
    return {
      id: poem.id,
      title: poem.title,
      category: "poem",
      ageGroups: [poem.ageGroup],
      primaryAgeGroup: poem.ageGroup,
      icon: poem.icon === "Heart" ? "HeartIcon" : poem.icon,
      durationSec: 30,
      offlineSuitability: "bundled",
      calmingIntensity: poem.mood === "Sleep" ? 1 : 2,
      loopRecommendation: "recommended",
      packId: "core-v1",
      tags: ["poem"],
      assetPath: poem.audioUrl?.replace("/infant-sleep-audio/", ""),
    };
  }

  if (id.startsWith("wn-")) {
    const proc = id.replace("wn-", "");
    return getSleepItemById(id) ?? getSleepItemById(`wn-${proc}`);
  }

  return undefined;
}
