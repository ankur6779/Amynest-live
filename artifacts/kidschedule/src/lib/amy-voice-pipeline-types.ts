/**
 * Shared types, constants, and helpers for amy-voice-pipeline layers.
 */

import { isCurrentAudioIntent } from "@/lib/amy-voice-ownership";
import { recordStaleAudioPrevented } from "@/lib/audio-playback-queue";
import {
  getPhonicsTrainingAudioText,
  normalizePhonicsLetterKey,
  PHONICS_DIGRAPH_SOUNDS,
} from "@workspace/phonics-sounds";
import type { AuthFetchFn } from "@/lib/poll-result";
import type { SpeakOptions, SpeakResult } from "@/hooks/use-amy-voice";
import type { AmyVoiceLayer, FailureChainEntry } from "@/lib/amy-voice-telemetry";
import type { PlaybackMode } from "@/lib/amy-voice-playback-contract";

export const LAYER1_TIMEOUT_MS = 1200;
export const LAYER2_TIMEOUT_MS = 1500;
export const OPENAI_DYNAMIC_TIMEOUT_MS = 1500;
export const ELEVENLABS_DYNAMIC_TIMEOUT_MS = 1800;
export const NEVER_SILENT_MS = 1500;
export const BLEND_WORD_FINALE_GAP_MS = 150;
export const QUALITY_PICK_WINDOW_MS = 150;
export const SPEECH_COACH_RETRY_DELAY_MS = 350;

const PRIORITY_PHONICS_CHUNKS = ["sh", "ch", "th", "ph", "ng", "ck"] as const;
const OTHER_DIGRAPH_KEYS = Object.keys(PHONICS_DIGRAPH_SOUNDS)
  .filter((k) => !PRIORITY_PHONICS_CHUNKS.includes(k as (typeof PRIORITY_PHONICS_CHUNKS)[number]))
  .sort((a, b) => b.length - a.length);
export const PHONICS_CHUNK_ORDER = [...PRIORITY_PHONICS_CHUNKS, ...OTHER_DIGRAPH_KEYS];

/** Bumps on each top-level speak — stale parallel runners abort. */
let activeSpeakGenerationInternal = 0;

export function getActiveSpeakGeneration(): number {
  return activeSpeakGenerationInternal;
}

export function bumpActiveSpeakGeneration(): number {
  activeSpeakGenerationInternal += 1;
  return activeSpeakGenerationInternal;
}

export type AmyVoicePipelineContext = {
  authFetch: AuthFetchFn;
  voiceId?: string;
  modelId?: string;
  playbackRate: number;
  playbackMode: PlaybackMode;
  isCancelled: () => boolean;
  onFinished?: () => void;
  paragraphIdx?: number;
  depth?: number;
  speakGeneration?: number;
  intentEpoch?: number;
  reliabilityModule?: import("@/lib/audio-reliability-telemetry").AudioReliabilityModule;
  reliabilityRequestId?: string | null;
  completionFinalized?: boolean;
  trackStreamingAttempt?: () => void;
  playbackTraceId?: string;
};

export type PlayAttemptResult =
  | {
      ok: true;
      layer: AmyVoiceLayer;
      stopPlayback?: () => void;
      playedDuration?: number;
      expectedDuration?: number;
      usedStreaming?: boolean;
    }
  | { ok: false; error: string };

export type LayerRunner = {
  quality: number;
  run: () => Promise<PlayAttemptResult>;
};

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isStale(ctx: AmyVoicePipelineContext): boolean {
  if (ctx.isCancelled()) return true;
  if (ctx.intentEpoch != null && !isCurrentAudioIntent(ctx.intentEpoch)) {
    recordStaleAudioPrevented();
    return true;
  }
  if ((ctx.depth ?? 0) > 0) return false;
  return ctx.speakGeneration !== getActiveSpeakGeneration();
}

export function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter((w) => w.length > 0);
}

/** Prefer digraph chunks (sh, ch, th…) then single letters — phoneme training lines. */
export function decomposePhonicsChunks(text: string): string[] {
  const trimmed = text.trim();
  const key = normalizePhonicsLetterKey(trimmed);
  if (key) return [getPhonicsTrainingAudioText(key)];

  const lower = trimmed.toLowerCase();
  const parts: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    for (const dg of PHONICS_CHUNK_ORDER) {
      if (lower.startsWith(dg, i)) {
        parts.push(getPhonicsTrainingAudioText(dg));
        i += dg.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const c = lower[i];
    if (c && /[a-z]/.test(c)) parts.push(getPhonicsTrainingAudioText(c));
    i += 1;
  }
  return parts.filter(Boolean);
}

export function decomposeSpellingLetters(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((l) => /^[a-z]{1,2}$/.test(l))
    .map((l) => getPhonicsTrainingAudioText(l));
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    delay(ms).then(() => Promise.reject(new Error(`${label}_timeout`))),
  ]);
}

export type NeverSilentPipelineFlags = {
  dynamicAttempted: boolean;
  streamingAttempted: boolean;
  emergencyAttempted: boolean;
  synthesisAttempted: boolean;
};

export type SpeakFinishResult = SpeakResult & { layer?: AmyVoiceLayer };

export type FinishAttemptFn = (
  result: PlayAttemptResult,
  isFallback?: boolean,
) => SpeakFinishResult;

export type { FailureChainEntry, SpeakOptions };
