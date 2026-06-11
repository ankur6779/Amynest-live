import type { LearningZonePrewarmContext } from "@/lib/learning-zone-audio-prewarm";
import {
  buildLearningZoneAudioCacheKey,
  buildLearningZoneAudioStateKey,
  getLearningZonePrewarmedAudio,
} from "@/lib/learning-zone-audio-prewarm";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { audioManager } from "@/lib/audio-manager";
import { recordHotCachePlay } from "@/lib/audio-hot-cache";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import { catalogPlaybackSpeakOptions } from "@/lib/unified-catalog-playback";
import { isMpVoiceModeEnabled } from "./feature-flags";

const VOICE_PREWARM_REVISION = 3;

export function buildMathPlaygroundPrewarmContext(ageBand: string): LearningZonePrewarmContext {
  return {
    module: "math_playground",
    texts: [],
    ageGroup: ageBand,
    stateKey: buildLearningZoneAudioStateKey({
      module: "math_playground",
      ageGroup: ageBand,
      revision: isMpVoiceModeEnabled() ? VOICE_PREWARM_REVISION : 2,
    }),
  };
}

export async function speakPlaygroundCue(
  text: string,
  ageBand: string,
  deps: {
    speak: (text: string, opts?: SpeakOptions) => Promise<{ success: boolean }>;
    playPreparedUrl: (
      url: string,
      opts?: {
        phrase?: string;
        source?: string;
        srcType?: "static" | "tts";
        playbackRate?: number;
        waitUntilEnd?: boolean;
      },
    ) => Promise<{ success: boolean }>;
    playbackRate?: number;
    isCancelled?: () => boolean;
  },
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (deps.isCancelled?.()) return;

  const ctx = buildMathPlaygroundPrewarmContext(ageBand);
  const cacheKey = buildLearningZoneAudioCacheKey(ctx, trimmed);
  const prewarmed = getLearningZonePrewarmedAudio(ctx, trimmed);
  const rate = deps.playbackRate ?? 0.95;

  if (prewarmed?.src) {
    recordHotCachePlay(cacheKey);
    if (rate !== 1) prewarmed.playbackRate = rate;
    const played = await audioManager.play(
      prewarmed,
      {
        proxyUrl: prewarmed.src,
        phrase: trimmed,
        source: "math_playground",
        channel: "speech",
        interrupt: true,
        srcType: "static",
      },
      { channel: "speech", interrupt: true },
    );
    if (played && !deps.isCancelled?.()) {
      await audioManager.waitUntilEnd(prewarmed, deps.isCancelled ?? (() => false));
      return;
    }
  }

  const staticUrl = lookupStaticAudioUrl(trimmed, "default");
  if (staticUrl && !deps.isCancelled?.()) {
    const res = await deps.playPreparedUrl(staticUrl, {
      phrase: trimmed,
      source: "math_playground",
      srcType: "static",
      playbackRate: rate,
      waitUntilEnd: true,
    });
    if (res.success) return;
  }

  if (deps.isCancelled?.()) return;
  await deps
    .speak(trimmed, {
      ...catalogPlaybackSpeakOptions(trimmed),
      playbackRate: rate,
      waitUntilEnd: true,
    })
    .catch(() => undefined);
}
