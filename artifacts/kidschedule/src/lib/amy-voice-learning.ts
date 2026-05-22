/**
 * Amy voice auto-learning — replay tracking, miss counts, priority-based static generation queue.
 */

import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import type { AmySpeechMode, AmySpeechPolicy } from "@/lib/amy-speech-mode";
import { normalizeStaticAudioKey, type StaticAudioMode } from "@workspace/static-audio/browser";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

export type LearningTier = "speech_coach" | "phonics" | "math" | "general";

const TIER_BASE: Record<LearningTier, number> = {
  speech_coach: 100,
  phonics: 75,
  math: 50,
  general: 25,
};

const missCounts = new Map<string, number>();
const replayCounts = new Map<string, number>();

type LearnQueueEntry = {
  key: string;
  text: string;
  mode: StaticAudioMode;
  speechMode: AmySpeechMode;
  priority: number;
  reason: string;
};

let learnQueue: LearnQueueEntry[] = [];
let learnFlushTimer: ReturnType<typeof setTimeout> | null = null;

function tierFromSpeechMode(mode: AmySpeechMode): LearningTier {
  switch (mode) {
    case "speech_coach":
      return "speech_coach";
    case "phonics":
    case "spelling":
      return "phonics";
    case "math":
    case "number":
      return "math";
    default:
      return "general";
  }
}

export function phraseLearningKey(text: string, pipelineMode: StaticAudioMode): string {
  const normalized = normalizeStaticAudioKey(text);
  if (!normalized) return "";
  return `${pipelineMode}:${normalized}`;
}

/** User replayed this phrase — prioritize static generation. Returns new replay count. */
export function recordAmyVoicePhraseReplay(
  text: string,
  pipelineMode: StaticAudioMode,
  speechMode: AmySpeechMode,
): number {
  const key = phraseLearningKey(text, pipelineMode);
  if (!key) return 0;
  const prev = replayCounts.get(key) ?? 0;
  const next = prev + 1;
  replayCounts.set(key, next);
  if (prev >= 1) {
    logAmyVoiceDiag("phrase_replay", {
      key,
      replays: next,
      speechMode,
    });
  }
  return next;
}

export function getPhraseReplayCount(
  text: string,
  pipelineMode: StaticAudioMode,
): number {
  const key = phraseLearningKey(text, pipelineMode);
  if (!key) return 0;
  return replayCounts.get(key) ?? 0;
}

export function getPhraseMissCount(text: string, pipelineMode: StaticAudioMode): number {
  const key = phraseLearningKey(text, pipelineMode);
  if (!key) return 0;
  return missCounts.get(key) ?? 0;
}

/** Phrase missed static/dynamic audio — bump learning priority. */
export function recordAmyVoicePhraseMiss(
  text: string,
  pipelineMode: StaticAudioMode,
  speechMode: AmySpeechMode,
): void {
  const key = phraseLearningKey(text, pipelineMode);
  if (!key) return;
  const prev = missCounts.get(key) ?? 0;
  missCounts.set(key, prev + 1);
  logAmyVoiceDiag("phrase_miss", { key, misses: prev + 1, speechMode });
}

export function computeLearningPriority(
  text: string,
  pipelineMode: StaticAudioMode,
  speechMode: AmySpeechMode,
  reason?: string,
): number {
  const key = phraseLearningKey(text, pipelineMode);
  const tier = TIER_BASE[tierFromSpeechMode(speechMode)];
  const misses = key ? (missCounts.get(key) ?? 0) : 0;
  const replays = key ? (replayCounts.get(key) ?? 0) : 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  let score = tier;
  score += Math.min(misses * 12, 72);
  score += Math.min(replays * 10, 50);
  if (wordCount >= 8) score += 12;
  if (wordCount >= 12) score += 18;
  if (reason?.includes("text_visual")) score += 22;
  if (reason?.includes("speech_synthesis") || reason === "emergency_local") score += 16;

  return score;
}

const HIGH_PRIORITY_SPEECH_MODES = new Set<AmySpeechMode>([
  "speech_coach",
  "phonics",
  "spelling",
]);

/** Gate learning enqueue to prevent queue overload at scale. */
export function shouldQueueAmyVoiceLearning(
  policy: AmySpeechPolicy,
  layer: AmyVoiceLayer | string,
): boolean {
  const isFallback =
    layer === "text_visual" ||
    (layer === "emergency_local" && policy.preferSpeechSynthesisFallback);
  if (!isFallback) return false;

  const highPriority = HIGH_PRIORITY_SPEECH_MODES.has(policy.speechMode);
  return policy.replayCount >= 2 || highPriority;
}

export function getAmyVoiceLearningSnapshot(): {
  topReplays: Array<{ key: string; count: number }>;
  topMisses: Array<{ key: string; count: number }>;
} {
  const topReplays = [...replayCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, count }));
  const topMisses = [...missCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, count }));
  return { topReplays, topMisses };
}

function scheduleLearnFlush(): void {
  if (learnFlushTimer) return;
  learnFlushTimer = setTimeout(() => {
    learnFlushTimer = null;
    void flushLearnQueue();
  }, 500);
}

async function flushLearnQueue(): Promise<void> {
  if (learnQueue.length === 0) return;
  const batch = [...learnQueue];
  learnQueue = [];

  const byKey = new Map<string, LearnQueueEntry>();
  for (const entry of batch) {
    const existing = byKey.get(entry.key);
    if (!existing || entry.priority > existing.priority) {
      byKey.set(entry.key, entry);
    }
  }

  const sorted = [...byKey.values()].sort((a, b) => b.priority - a.priority);
  const { reportAmyVoiceLearningBatch } = await import("@/lib/static-audio");
  reportAmyVoiceLearningBatch(sorted);
}

/** Queue phrase for prioritized static audio generation. */
export function queueAmyVoiceLearning(
  rawText: string,
  pipelineMode: StaticAudioMode,
  speechMode: AmySpeechMode,
  reason: string,
): void {
  const text = (rawText ?? "").trim();
  if (!text) return;
  const key = phraseLearningKey(text, pipelineMode);
  if (!key) return;

  const priority = computeLearningPriority(text, pipelineMode, speechMode, reason);
  learnQueue.push({
    key,
    text,
    mode: pipelineMode,
    speechMode,
    priority,
    reason,
  });

  logAmyVoiceDiag("auto_learn_queue", {
    text: text.slice(0, 100),
    mode: pipelineMode,
    speechMode,
    priority,
    reason,
  });
  scheduleLearnFlush();
}

/** Record miss and queue only when fallback + replay/high-priority gate passes. */
export function maybeQueueAmyVoiceLearning(
  policy: AmySpeechPolicy,
  layer: AmyVoiceLayer | string,
): void {
  if (!shouldQueueAmyVoiceLearning(policy, layer)) return;

  recordAmyVoicePhraseMiss(policy.normalizedText, policy.pipelineMode, policy.speechMode);
  queueAmyVoiceLearning(
    policy.normalizedText,
    policy.pipelineMode,
    policy.speechMode,
    String(layer),
  );
  for (const phrase of policy.phrases) {
    recordAmyVoicePhraseMiss(phrase, policy.pipelineMode, policy.speechMode);
    queueAmyVoiceLearning(phrase, policy.pipelineMode, policy.speechMode, `${layer}_phrase`);
  }
}

export function resetAmyVoiceLearningSession(): void {
  missCounts.clear();
  replayCounts.clear();
  learnQueue = [];
  if (learnFlushTimer) {
    clearTimeout(learnFlushTimer);
    learnFlushTimer = null;
  }
}
