/**
 * Global in-flight TTS generation coalescer — prevents duplicate ElevenLabs billing
 * for identical (model + voice + text + mode) requests across all routes.
 */

import type { SynthesizeMode } from "./ttsCacheService.js";
import { computeTtsCacheKey } from "./ttsCacheService.js";
import { getAmyTtsModelId, getAmyTtsVoiceId } from "../lib/amy-tts-config.js";

const inflight = new Map<string, Promise<unknown>>();

export function ttsGenerationInflightKey(
  text: string,
  voiceId?: string,
  modelId?: string,
  mode: SynthesizeMode = "default",
): string {
  const vid = voiceId?.trim() || getAmyTtsVoiceId();
  const mid = modelId?.trim() || getAmyTtsModelId();
  return computeTtsCacheKey(text.trim(), vid, mid, mode);
}

/** Await an in-flight generation or run `fn` once and share the result. */
export async function withTtsInflightGeneration<T>(
  cacheKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  const pending = inflight.get(cacheKey);
  if (pending) {
    return pending as Promise<T>;
  }
  const generation = fn().finally(() => {
    if (inflight.get(cacheKey) === generation) {
      inflight.delete(cacheKey);
    }
  });
  inflight.set(cacheKey, generation);
  return generation;
}

export function clearTtsInflightForTests(): void {
  inflight.clear();
}
