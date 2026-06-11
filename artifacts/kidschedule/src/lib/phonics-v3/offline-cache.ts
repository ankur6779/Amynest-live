/**
 * Offline-first phonics — cache audit and prefetch orchestration.
 */
import { getAllPhonicsAudioKeys, CVC_WORDS } from "@workspace/phonics-sounds";
import { WORD_FAMILIES } from "@/lib/phonics-v2/content/word-families";
import { prefetchPhonicsAudioKeys, prefetchPhonicsContentTexts } from "@/lib/phonics-static-audio";
import { getDecodableStoryCatalog } from "./content/story-catalog";
import { DIGRAPH_PATHWAY } from "./content/digraph-pathway";

export type OfflineCacheCategory =
  | "phoneme"
  | "cvc"
  | "story"
  | "digraph"
  | "mission";

export type OfflineCacheAudit = {
  categories: Record<
    OfflineCacheCategory,
    { requested: number; description: string }
  >;
  totalAssets: number;
  /** Estimated % of phonics UX available without network after prefetch */
  offlineCoveragePct: number;
  gaps: string[];
};

export function buildOfflinePrefetchPlan(opts?: {
  missionWords?: string[];
  storyIds?: string[];
  includeDigraphs?: boolean;
}): { phonemeKeys: string[]; cvcWords: string[]; storyTexts: string[] } {
  let phonemeKeys = [...getAllPhonicsAudioKeys()];
  const familyWords = WORD_FAMILIES.flatMap((f) => f.words.map((w) => w.word));
  const cvcWords = [
    ...new Set([
      ...CVC_WORDS.map((e) => e.word),
      ...familyWords,
      ...(opts?.missionWords ?? []),
    ]),
  ];
  const catalog = getDecodableStoryCatalog();
  const storyTexts = (opts?.storyIds ?? catalog.slice(0, 20).map((s) => s.id))
    .map((id) => catalog.find((s) => s.id === id))
    .filter(Boolean)
    .flatMap((s) => s!.lines.map((l) => l.text));

  if (opts?.includeDigraphs) {
    for (const d of DIGRAPH_PATHWAY) {
      phonemeKeys.push(d.phoneme);
      cvcWords.push(...d.words.map((w) => w.word));
    }
  }

  return {
    phonemeKeys: [...new Set(phonemeKeys)],
    cvcWords: [...new Set(cvcWords)],
    storyTexts: [...new Set(storyTexts)],
  };
}

export function prefetchOfflinePhonicsPack(plan: ReturnType<typeof buildOfflinePrefetchPlan>): void {
  prefetchPhonicsAudioKeys(plan.phonemeKeys.slice(0, 40));
  prefetchPhonicsContentTexts(plan.cvcWords.slice(0, 40), "cvc");
  for (const text of plan.storyTexts.slice(0, 15)) {
    prefetchPhonicsContentTexts([text], "sentence");
  }
}

export function auditOfflineCache(plan: ReturnType<typeof buildOfflinePrefetchPlan>): OfflineCacheAudit {
  const gaps: string[] = [];
  if (plan.phonemeKeys.length < 20) gaps.push("phoneme pool small");
  if (plan.cvcWords.length < 30) gaps.push("cvc pool small");

  const categories: OfflineCacheAudit["categories"] = {
    phoneme: { requested: plan.phonemeKeys.length, description: "Letter & digraph clips" },
    cvc: { requested: plan.cvcWords.length, description: "CVC whole-word clips" },
    story: { requested: plan.storyTexts.length, description: "Decodable sentence lines" },
    digraph: { requested: DIGRAPH_PATHWAY.length, description: "Digraph pathway stages" },
    mission: { requested: plan.cvcWords.length, description: "Daily mission words" },
  };

  const totalAssets =
    categories.phoneme.requested +
    categories.cvc.requested +
    categories.story.requested;

  const offlineCoveragePct = Math.min(
    95,
    Math.round(
      (Math.min(plan.phonemeKeys.length, 36) / 36) * 35 +
        (Math.min(plan.cvcWords.length, 50) / 50) * 35 +
        (Math.min(plan.storyTexts.length, 30) / 30) * 20 +
        10,
    ),
  );

  return { categories, totalAssets, offlineCoveragePct, gaps };
}
