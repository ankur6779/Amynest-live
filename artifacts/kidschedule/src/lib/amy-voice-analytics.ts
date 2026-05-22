/**
 * Amy voice analytics — difficulty transitions, recovery, confidence cues, struggle phrases.
 */

import type { AmyDifficultyLevel } from "@/lib/amy-voice-difficulty";
import {
  computeLearningPriority,
  getAmyVoiceLearningSnapshot,
  phraseLearningKey,
} from "@/lib/amy-voice-learning";
import type { AmySpeechMode } from "@/lib/amy-speech-mode";
import type { StaticAudioMode } from "@workspace/static-audio/browser";
import { buildWeeklyStruggleReview, type WeeklyStruggleReview } from "@/lib/amy-voice-struggle-insights";
import { getAmyVoiceDeliverySnapshot } from "@/lib/amy-voice-delivery-profile";

export type StrugglePhraseSignal = {
  replayCount?: number;
  difficulty?: AmyDifficultyLevel;
  fallback?: boolean;
  recoveryUsed?: boolean;
};

export type StrugglePhraseEntry = {
  key: string;
  text: string;
  speechMode: AmySpeechMode;
  pipelineMode: StaticAudioMode;
  score: number;
  replays: number;
  misses: number;
  strugglingEvents: number;
  fallbackEvents: number;
  staticAudioPriority: number;
  lastSeenAt: number;
};

export type StaticAudioPriorityEntry = {
  key: string;
  text: string;
  speechMode: AmySpeechMode;
  pipelineMode: StaticAudioMode;
  priority: number;
  reason: string;
};

export type AmyVoiceAnalyticsSnapshot = {
  difficultyTransitions: number;
  lastDifficultyTransition: {
    from: AmyDifficultyLevel;
    to: AmyDifficultyLevel;
    at: number;
  } | null;
  recoveryUsage: number;
  recoveryByContext: Record<string, number>;
  confidenceCueUsage: number;
  recentConfidenceCues: string[];
  topStrugglePhrases: StrugglePhraseEntry[];
  staticAudioPriorities: StaticAudioPriorityEntry[];
  weeklyStruggleReview: WeeklyStruggleReview;
  delivery: ReturnType<typeof getAmyVoiceDeliverySnapshot>;
};

const MAX_TRANSITIONS = 40;
const MAX_CUE_HISTORY = 12;
const MAX_STRUGGLE_PHRASES = 30;

const difficultyTransitions: Array<{
  from: AmyDifficultyLevel;
  to: AmyDifficultyLevel;
  at: number;
}> = [];
const recoveryByContext: Record<string, number> = {};
const strugglePhrases = new Map<string, StrugglePhraseEntry>();

let recoveryUsage = 0;
let confidenceCueUsage = 0;
const recentConfidenceCues: string[] = [];

function struggleScore(entry: StrugglePhraseEntry): number {
  return (
    entry.replays * 4 +
    entry.misses * 6 +
    entry.strugglingEvents * 8 +
    entry.fallbackEvents * 10
  );
}

function refreshStruggleScore(entry: StrugglePhraseEntry): void {
  entry.score = struggleScore(entry);
  entry.staticAudioPriority = computeLearningPriority(
    entry.text,
    entry.pipelineMode,
    entry.speechMode,
    entry.fallbackEvents > 0 ? "text_visual" : "struggle_analytics",
  );
}

export function recordAmyVoiceDifficultyTransition(
  from: AmyDifficultyLevel,
  to: AmyDifficultyLevel,
): void {
  if (from === to) return;
  difficultyTransitions.push({ from, to, at: Date.now() });
  if (difficultyTransitions.length > MAX_TRANSITIONS) {
    difficultyTransitions.shift();
  }
  if (import.meta.env.DEV) {
    console.info("[AMY VOICE]", "difficulty_transition", { from, to });
  }
}

export function recordAmyVoiceRecoveryUsage(context = "struggling_support"): void {
  recoveryUsage += 1;
  recoveryByContext[context] = (recoveryByContext[context] ?? 0) + 1;
  if (import.meta.env.DEV) {
    console.info("[AMY VOICE]", "recovery_usage", { context, total: recoveryUsage });
  }
}

export function recordAmyVoiceConfidenceCueUsage(cue?: string): void {
  confidenceCueUsage += 1;
  if (cue) {
    recentConfidenceCues.push(cue);
    if (recentConfidenceCues.length > MAX_CUE_HISTORY) {
      recentConfidenceCues.shift();
    }
  }
  if (import.meta.env.DEV) {
    console.info("[AMY VOICE]", "confidence_cue", { cue, total: confidenceCueUsage });
  }
}

/** Track phrases where learners struggle — drives static audio + teaching refinement. */
export function recordAmyVoiceStrugglePhrase(
  text: string,
  speechMode: AmySpeechMode,
  pipelineMode: StaticAudioMode,
  signals: StrugglePhraseSignal = {},
): void {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return;
  const key = phraseLearningKey(trimmed, pipelineMode);
  if (!key) return;

  const existing = strugglePhrases.get(key);
  const entry: StrugglePhraseEntry = existing ?? {
    key,
    text: trimmed,
    speechMode,
    pipelineMode,
    score: 0,
    replays: 0,
    misses: 0,
    strugglingEvents: 0,
    fallbackEvents: 0,
    staticAudioPriority: 0,
    lastSeenAt: Date.now(),
  };

  if ((signals.replayCount ?? 0) >= 2) entry.replays += 1;
  if (signals.difficulty === "struggling") entry.strugglingEvents += 1;
  if (signals.fallback) {
    entry.fallbackEvents += 1;
    entry.misses += 1;
  }
  if (signals.recoveryUsed) entry.strugglingEvents += 1;
  entry.lastSeenAt = Date.now();
  refreshStruggleScore(entry);
  strugglePhrases.set(key, entry);

  if (strugglePhrases.size > MAX_STRUGGLE_PHRASES) {
    const sorted = [...strugglePhrases.values()].sort((a, b) => a.score - b.score);
    for (let i = 0; i < sorted.length - MAX_STRUGGLE_PHRASES; i++) {
      strugglePhrases.delete(sorted[i]!.key);
    }
  }
}

export function getTopStrugglePhrases(limit = 10): StrugglePhraseEntry[] {
  return [...strugglePhrases.values()]
    .sort((a, b) => b.score - a.score || b.lastSeenAt - a.lastSeenAt)
    .slice(0, limit);
}

export function buildStaticAudioPriorities(limit = 10): StaticAudioPriorityEntry[] {
  const learning = getAmyVoiceLearningSnapshot();
  const merged = new Map<string, StaticAudioPriorityEntry>();

  for (const entry of getTopStrugglePhrases(limit)) {
    merged.set(entry.key, {
      key: entry.key,
      text: entry.text,
      speechMode: entry.speechMode,
      pipelineMode: entry.pipelineMode,
      priority: entry.staticAudioPriority,
      reason: "struggle_phrase",
    });
  }

  for (const miss of learning.topMisses) {
    const [pipelineMode, ...rest] = miss.key.split(":");
    const text = rest.join(":");
    const key = miss.key;
    const existing = merged.get(key);
    const priority = computeLearningPriority(
      text,
      (pipelineMode as StaticAudioMode) || "default",
      "word",
      "phrase_miss",
    );
    if (!existing || priority > existing.priority) {
      merged.set(key, {
        key,
        text,
        speechMode: "word",
        pipelineMode: (pipelineMode as StaticAudioMode) || "default",
        priority,
        reason: "phrase_miss",
      });
    }
  }

  for (const replay of learning.topReplays) {
    const [pipelineMode, ...rest] = replay.key.split(":");
    const text = rest.join(":");
    const key = replay.key;
    const existing = merged.get(key);
    const priority = computeLearningPriority(
      text,
      (pipelineMode as StaticAudioMode) || "default",
      "word",
      "phrase_replay",
    );
    if (!existing || priority > existing.priority) {
      merged.set(key, {
        key,
        text,
        speechMode: "word",
        pipelineMode: (pipelineMode as StaticAudioMode) || "default",
        priority,
        reason: "phrase_replay",
      });
    }
  }

  return [...merged.values()].sort((a, b) => b.priority - a.priority).slice(0, limit);
}

export function getAmyVoiceAnalyticsSnapshot(): AmyVoiceAnalyticsSnapshot {
  const last = difficultyTransitions[difficultyTransitions.length - 1] ?? null;
  return {
    difficultyTransitions: difficultyTransitions.length,
    lastDifficultyTransition: last,
    recoveryUsage,
    recoveryByContext: { ...recoveryByContext },
    confidenceCueUsage,
    recentConfidenceCues: [...recentConfidenceCues],
    topStrugglePhrases: getTopStrugglePhrases(10),
    staticAudioPriorities: buildStaticAudioPriorities(10),
    weeklyStruggleReview: buildWeeklyStruggleReview(),
    delivery: getAmyVoiceDeliverySnapshot(),
  };
}

export function resetAmyVoiceAnalytics(): void {
  difficultyTransitions.length = 0;
  recoveryUsage = 0;
  confidenceCueUsage = 0;
  recentConfidenceCues.length = 0;
  strugglePhrases.clear();
  for (const key of Object.keys(recoveryByContext)) delete recoveryByContext[key];
}
