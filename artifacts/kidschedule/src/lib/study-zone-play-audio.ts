import type { PlayItem } from "@workspace/study-zone";
import {
  getPlayItemCatalogSpeakOpts,
  getPlayItemSpeakParts,
} from "@workspace/study-zone";
import type { AuthFetchFn } from "@/lib/poll-result";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { audioManager } from "@/lib/audio-manager";
import { recordHotCachePlay } from "@/lib/audio-hot-cache";
import {
  buildLearningZoneAudioCacheKey,
  buildLearningZoneAudioStateKey,
  getLearningZonePrewarmedAudio,
  scheduleLearningZoneAudioPrewarm,
  type LearningZonePrewarmContext,
} from "@/lib/learning-zone-audio-prewarm";
import { lookupStaticAudioUrl, preloadStaticPhrases } from "@/lib/static-audio";

export function buildSmartStudyPrewarmContext(
  childId: number,
  categoryId: string,
  ageYears: number,
): LearningZonePrewarmContext {
  return {
    module: "learn_with_amy",
    texts: [],
    ageGroup: String(ageYears),
    stateKey: buildLearningZoneAudioStateKey({
      module: "learn_with_amy",
      ageGroup: String(ageYears),
      revision: `smart-study:${childId}:${categoryId}`,
    }),
  };
}

export function collectSmartStudyCategoryTexts(
  items: PlayItem[],
  categoryId: string,
  limit = 32,
): string[] {
  const texts: string[] = [];
  const seen = new Set<string>();
  for (const item of items.slice(0, limit)) {
    for (const part of getPlayItemSpeakParts(item, categoryId)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      texts.push(trimmed);
    }
  }
  return texts;
}

export function scheduleSmartStudyCategoryPrewarm(
  authFetch: AuthFetchFn,
  childId: number,
  categoryId: string,
  ageYears: number,
  items: PlayItem[],
): void {
  const texts = collectSmartStudyCategoryTexts(items, categoryId);
  if (texts.length === 0) return;
  const ctx = buildSmartStudyPrewarmContext(childId, categoryId, ageYears);
  scheduleLearningZoneAudioPrewarm(authFetch, {
    ...ctx,
    texts,
    sequenceTexts: texts,
  });
  preloadStaticPhrases(texts, "default", texts.length);
}

export async function speakPlayItemCue(
  item: PlayItem,
  categoryId: string,
  prewarmCtx: LearningZonePrewarmContext,
  deps: {
    speak: (text: string, opts?: SpeakOptions) => Promise<{ success: boolean }>;
    playPreparedUrl: (
      url: string,
      opts?: {
        phrase?: string;
        source?: string;
        srcType?: "static" | "tts";
        waitUntilEnd?: boolean;
      },
    ) => Promise<{ success: boolean }>;
    isCancelled?: () => boolean;
  },
): Promise<void> {
  const parts = getPlayItemSpeakParts(item, categoryId);
  const catalogOpts = getPlayItemCatalogSpeakOpts(item, categoryId);

  for (const part of parts) {
    if (deps.isCancelled?.()) return;
    const trimmed = part.trim();
    if (!trimmed) continue;

    const cacheKey = buildLearningZoneAudioCacheKey(prewarmCtx, trimmed);
    const prewarmed = getLearningZonePrewarmedAudio(prewarmCtx, trimmed);

    if (prewarmed?.src) {
      recordHotCachePlay(cacheKey);
      const played = await audioManager.play(
        prewarmed,
        {
          proxyUrl: prewarmed.src,
          phrase: trimmed,
          source: "smart_study",
          channel: "speech",
          interrupt: true,
          srcType: "static",
        },
        { channel: "speech", interrupt: true },
      );
      if (played && !deps.isCancelled?.()) {
        await audioManager.waitUntilEnd(prewarmed, deps.isCancelled ?? (() => false));
        continue;
      }
    }

    const staticUrl = lookupStaticAudioUrl(trimmed, "default");
    if (staticUrl && !deps.isCancelled?.()) {
      const res = await deps.playPreparedUrl(staticUrl, {
        phrase: trimmed,
        source: "smart_study",
        srcType: "static",
        waitUntilEnd: true,
      });
      if (res.success) continue;
    }

    if (deps.isCancelled?.()) return;
    await deps
      .speak(trimmed, {
        ...catalogOpts,
        waitUntilEnd: true,
      })
      .catch(() => undefined);
  }
}
