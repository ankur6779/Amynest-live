/**
 * Phonics clip quality metadata — build-time catalog + runtime learning-safe routing.
 */

import { isPhonicsStopSoundKey, PHONICS_MAX_REJECT_DURATION_MS, PHONICS_STOP_SOUND_MAX_DURATION_MS } from "./phonics-generation.js";

export type PhonicsAudioSource = "elevenlabs" | "fallback_tone";
export type PhonicsAudioQuality = "auto" | "approved" | "needs_review";

export type PhonicsAudioMeta = {
  key: string;
  durationMs: number;
  size: number;
  source: PhonicsAudioSource;
  quality: PhonicsAudioQuality;
  version: number;
  /** Auto-detected issue code, if any. */
  flag?: string | null;
  updatedAt?: string;
};

export type PhonicsAudioManifestFile = {
  version: number;
  basePath: string;
  provider?: string;
  voiceId?: string;
  modelId?: string;
  speakTextStyle?: string;
  generatedAt?: string;
  normalizedAt?: string;
  ffmpegTrim?: boolean;
  mastering?: { pipeline: string[]; output?: { sampleRate: number; channels: number } };
  keys?: string[];
  cvcSmokeKeys?: string[];
  fallbackCount?: number;
  clips?: Record<string, PhonicsAudioMeta>;
};

/** Auto quality tier from duration alone. */
export function markForReview(durationMs: number): PhonicsAudioQuality {
  if (durationMs > 700) return "needs_review";
  if (durationMs < 300) return "needs_review";
  return "auto";
}

/** Smart filter — suspicious clip codes for QA dashboard. */
export function detectSuspiciousAudio(key: string, durationMs: number): string | null {
  const k = key.trim().toLowerCase();

  if (isPhonicsStopSoundKey(k) && durationMs > PHONICS_STOP_SOUND_MAX_DURATION_MS) {
    return "too_long_stop_sound";
  }

  if (durationMs > PHONICS_MAX_REJECT_DURATION_MS) {
    return "likely_wrong_pronunciation";
  }

  if (durationMs < 250) {
    return "too_short_mobile";
  }

  return null;
}

export function shouldSkipStaticClipForLearning(meta: PhonicsAudioMeta | undefined): boolean {
  if (!meta) return false;
  if (meta.source === "fallback_tone") return true;
  if (meta.quality === "needs_review" && meta.flag) return true;
  return false;
}

export function buildPhonicsAudioMeta(input: {
  key: string;
  durationMs: number;
  size: number;
  source: PhonicsAudioSource;
  previous?: PhonicsAudioMeta | null;
  preserveApproved?: boolean;
}): PhonicsAudioMeta {
  const key = input.key.trim().toLowerCase();
  const flag = detectSuspiciousAudio(key, input.durationMs);
  let quality = markForReview(input.durationMs);

  if (input.source === "fallback_tone") {
    quality = "needs_review";
  }

  if (flag) {
    quality = "needs_review";
  }

  if (input.preserveApproved && input.previous?.quality === "approved") {
    quality = "approved";
  }

  const version =
    input.previous && input.previous.source === input.source && input.previous.size === input.size
      ? input.previous.version
      : (input.previous?.version ?? 0) + 1;

  return {
    key,
    durationMs: input.durationMs,
    size: input.size,
    source: input.source,
    quality,
    version,
    flag,
    updatedAt: new Date().toISOString(),
  };
}

export function approvePhonemeMeta(
  meta: PhonicsAudioMeta,
): PhonicsAudioMeta {
  return {
    ...meta,
    quality: "approved",
    flag: null,
    updatedAt: new Date().toISOString(),
  };
}

export function isUpgradeQualityCandidate(
  meta: PhonicsAudioMeta | undefined,
): boolean {
  if (!meta) return true;
  return meta.quality !== "approved";
}
