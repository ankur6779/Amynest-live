/**
 * Mastery integrity — anti-farming gates for Phonics V3.
 * Session caps, replay cooldown, accuracy/confidence gates, spam detection.
 */
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { getFamilyForWord } from "@/lib/phonics-v2/content/word-families";
import type { MasteryDimension, MasteryTargetType, PhonicsMasteryState } from "./mastery-engine";
import {
  MASTERY_THRESHOLDS,
  recordMasteryEvent,
} from "./mastery-engine";

export type MasteryActivity =
  | "karaoke"
  | "voice"
  | "family_practice"
  | "digraph"
  | "identify";

export const INTEGRITY_LIMITS = {
  REPLAY_COOLDOWN_MS: 45_000,
  SPAM_BURST_WINDOW_MS: 2_500,
  SPAM_BURST_MAX_EVENTS: 4,
  SPAM_BLOCK_MS: 30_000,
  KARAOKE_MIN_ACCURACY: 0.75,
  VOICE_MIN_CONFIDENCE: 0.55,
  FIRST_ATTEMPT_WEIGHT: 1,
  SECOND_ATTEMPT_WEIGHT: 0.5,
  THIRD_PLUS_ATTEMPT_WEIGHT: 0.15,
  MISTAKE_CONFIDENCE_PENALTY: 10,
  /** Max mastery credits per activity+skill+dimension per day */
  DAILY_ACTIVITY_CREDIT_CAP: 1,
} as const;

export type MasteryAttemptInput = {
  activity: MasteryActivity;
  targetType: MasteryTargetType;
  targetId: string;
  dimension: MasteryDimension;
  passed: boolean;
  accuracy?: number;
  confidence?: number;
  attemptNumber?: number;
  now?: number;
};

export type MasteryAttemptVerdict = {
  creditWeight: number;
  blocked: boolean;
  blockReason?: string;
  confidenceScore: number;
  appliesMastery: boolean;
};

export type MasteryIntegrityState = {
  version: 3;
  dateKey: string;
  /** Fractional credit toward next mastery count increment */
  pendingCredits: Record<string, number>;
  /** Credits granted today per activity session key */
  dailyActivityCredits: Record<string, number>;
  /** Last attempt timestamp per session key */
  lastAttempts: Record<string, number>;
  /** Attempt count per session key (resets daily) */
  attemptCounts: Record<string, number>;
  /** Per-word confidence 0–100 */
  confidenceScores: Record<string, number>;
  /** Consecutive mistakes per word */
  mistakeCounts: Record<string, number>;
  /** Recent event timestamps for burst detection */
  recentEvents: number[];
  spamBlockedUntil: number;
};

const STORAGE_PREFIX = "amynest:phonics-v3-integrity:";

function todayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function sessionKey(input: MasteryAttemptInput): string {
  const id = input.targetId.trim().toLowerCase();
  return `${input.activity}:${input.targetType}:${id}:${input.dimension}`;
}

function pendingKey(targetType: MasteryTargetType, id: string, dimension: MasteryDimension): string {
  return `${targetType}:${id.trim().toLowerCase()}:${dimension}`;
}

export function defaultIntegrityState(now = Date.now()): MasteryIntegrityState {
  return {
    version: 3,
    dateKey: todayKey(now),
    pendingCredits: {},
    dailyActivityCredits: {},
    lastAttempts: {},
    attemptCounts: {},
    confidenceScores: {},
    mistakeCounts: {},
    recentEvents: [],
    spamBlockedUntil: 0,
  };
}

export function loadIntegrityState(childId: number): MasteryIntegrityState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultIntegrityState();
    const parsed = JSON.parse(raw) as MasteryIntegrityState;
    const now = Date.now();
    if (parsed.dateKey !== todayKey(now)) {
      return {
        ...defaultIntegrityState(now),
        confidenceScores: parsed.confidenceScores ?? {},
        mistakeCounts: parsed.mistakeCounts ?? {},
      };
    }
    return { ...defaultIntegrityState(now), ...parsed };
  } catch {
    return defaultIntegrityState();
  }
}

export function saveIntegrityState(childId: number, state: MasteryIntegrityState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function pruneRecentEvents(events: number[], now: number): number[] {
  const cutoff = now - INTEGRITY_LIMITS.SPAM_BURST_WINDOW_MS;
  return events.filter((t) => t >= cutoff);
}

function detectSpam(state: MasteryIntegrityState, now: number): MasteryIntegrityState {
  const recent = pruneRecentEvents([...state.recentEvents, now], now);
  if (recent.length > INTEGRITY_LIMITS.SPAM_BURST_MAX_EVENTS) {
    return {
      ...state,
      recentEvents: recent,
      spamBlockedUntil: now + INTEGRITY_LIMITS.SPAM_BLOCK_MS,
    };
  }
  return { ...state, recentEvents: recent };
}

function attemptWeight(attemptNumber: number): number {
  if (attemptNumber <= 1) return INTEGRITY_LIMITS.FIRST_ATTEMPT_WEIGHT;
  if (attemptNumber === 2) return INTEGRITY_LIMITS.SECOND_ATTEMPT_WEIGHT;
  return INTEGRITY_LIMITS.THIRD_PLUS_ATTEMPT_WEIGHT;
}

function passesCorrectnessGate(input: MasteryAttemptInput): { ok: boolean; reason?: string } {
  const id = input.targetId.trim().toLowerCase();

  if (input.activity === "karaoke") {
    const accuracy = input.accuracy ?? 0;
    if (!input.passed) return { ok: false, reason: "karaoke-incomplete" };
    if (accuracy < INTEGRITY_LIMITS.KARAOKE_MIN_ACCURACY) {
      return { ok: false, reason: "karaoke-accuracy-below-threshold" };
    }
    return { ok: true };
  }

  if (input.activity === "voice") {
    const confidence = input.confidence ?? 0;
    if (!input.passed) return { ok: false, reason: "voice-incorrect" };
    if (confidence < INTEGRITY_LIMITS.VOICE_MIN_CONFIDENCE) {
      return { ok: false, reason: "voice-confidence-below-threshold" };
    }
    return { ok: true };
  }

  if (input.activity === "family_practice" || input.activity === "identify") {
    if (input.dimension === "identified" && !input.passed) {
      return { ok: false, reason: "identify-not-mastered" };
    }
    return { ok: true };
  }

  return { ok: input.passed, reason: input.passed ? undefined : "activity-failed" };
}

function isAtDimensionCap(
  mastery: PhonicsMasteryState,
  type: MasteryTargetType,
  id: string,
  dimension: MasteryDimension,
): boolean {
  const key = id.trim().toLowerCase();
  const bucket =
    type === "word"
      ? mastery.words
      : type === "letter"
        ? mastery.letters
        : type === "phoneme"
          ? mastery.phonemes
          : mastery.families;
  const rec = bucket[key];
  if (!rec) return false;
  return rec.counts[dimension] >= MASTERY_THRESHOLDS[dimension];
}

/** Evaluate whether a mastery attempt earns credit. */
export function evaluateMasteryAttempt(
  integrity: MasteryIntegrityState,
  mastery: PhonicsMasteryState,
  input: MasteryAttemptInput,
): { integrity: MasteryIntegrityState; verdict: MasteryAttemptVerdict } {
  const now = input.now ?? Date.now();
  let state =
    integrity.dateKey !== todayKey(now)
      ? {
          ...defaultIntegrityState(now),
          confidenceScores: integrity.confidenceScores,
          mistakeCounts: integrity.mistakeCounts,
        }
      : { ...integrity };

  state = detectSpam(state, now);
  const wordId = input.targetId.trim().toLowerCase();
  const confBase = state.confidenceScores[wordId] ?? 50;
  const sKey = sessionKey(input);

  if (now < state.spamBlockedUntil) {
    return {
      integrity: state,
      verdict: {
        creditWeight: 0,
        blocked: true,
        blockReason: "spam-burst",
        confidenceScore: confBase,
        appliesMastery: false,
      },
    };
  }

  if (isAtDimensionCap(mastery, input.targetType, input.targetId, input.dimension)) {
    return {
      integrity: state,
      verdict: {
        creditWeight: 0,
        blocked: true,
        blockReason: "dimension-capped",
        confidenceScore: confBase,
        appliesMastery: false,
      },
    };
  }

  const gate = passesCorrectnessGate(input);
  let confidenceScore = confBase;

  if (!gate.ok) {
    const mistakes = (state.mistakeCounts[wordId] ?? 0) + 1;
    confidenceScore = Math.max(0, confBase - INTEGRITY_LIMITS.MISTAKE_CONFIDENCE_PENALTY);
    state = {
      ...state,
      mistakeCounts: { ...state.mistakeCounts, [wordId]: mistakes },
      confidenceScores: { ...state.confidenceScores, [wordId]: confidenceScore },
      attemptCounts: {
        ...state.attemptCounts,
        [sKey]: (state.attemptCounts[sKey] ?? 0) + 1,
      },
      lastAttempts: { ...state.lastAttempts, [sKey]: now },
    };
    return {
      integrity: state,
      verdict: {
        creditWeight: 0,
        blocked: true,
        blockReason: gate.reason,
        confidenceScore,
        appliesMastery: false,
      },
    };
  }

  const lastAt = state.lastAttempts[sKey] ?? 0;
  const inCooldown = now - lastAt < INTEGRITY_LIMITS.REPLAY_COOLDOWN_MS && lastAt > 0;
  const dailyCredits = state.dailyActivityCredits[sKey] ?? 0;
  const atDailyCap = dailyCredits >= INTEGRITY_LIMITS.DAILY_ACTIVITY_CREDIT_CAP;

  const attemptNum = input.attemptNumber ?? (state.attemptCounts[sKey] ?? 0) + 1;
  let creditWeight = attemptWeight(attemptNum);

  if (inCooldown) creditWeight = 0;
  if (atDailyCap) creditWeight = 0;

  if (input.confidence != null && input.confidence >= 0) {
    creditWeight *= Math.min(1, input.confidence);
  }
  if (input.accuracy != null && input.accuracy >= 0) {
    creditWeight *= Math.min(1, input.accuracy);
  }

  if (attemptNum === 1 && input.passed) {
    confidenceScore = Math.min(100, confBase + 8);
  }

  state = {
    ...state,
    attemptCounts: { ...state.attemptCounts, [sKey]: attemptNum },
    lastAttempts: { ...state.lastAttempts, [sKey]: now },
    confidenceScores: { ...state.confidenceScores, [wordId]: confidenceScore },
    mistakeCounts: { ...state.mistakeCounts, [wordId]: 0 },
  };

  if (creditWeight > 0) {
    state = {
      ...state,
      dailyActivityCredits: {
        ...state.dailyActivityCredits,
        [sKey]: dailyCredits + creditWeight,
      },
    };
  }

  const appliesMastery = creditWeight > 0;
  return {
    integrity: state,
    verdict: {
      creditWeight,
      blocked: !appliesMastery,
      blockReason: inCooldown
        ? "replay-cooldown"
        : atDailyCap
          ? "session-cap"
          : undefined,
      confidenceScore,
      appliesMastery,
    },
  };
}

function recordWordMasteryOnce(
  state: PhonicsMasteryState,
  word: string,
  dimension: MasteryDimension,
): PhonicsMasteryState {
  const w = word.trim().toLowerCase();
  let next = recordMasteryEvent(state, "word", w, dimension);
  for (const ch of w) {
    if (!isAtDimensionCap(next, "letter", ch, dimension === "spoken" ? "spoken" : "heard")) {
      next = recordMasteryEvent(next, "letter", ch, dimension === "spoken" ? "spoken" : "heard");
    }
  }
  const entry = getCvcWordEntry(w);
  if (entry) {
    for (const p of entry.phonemes) {
      if (!isAtDimensionCap(next, "phoneme", p, dimension)) {
        next = recordMasteryEvent(next, "phoneme", p, dimension);
      }
    }
  }
  const family = getFamilyForWord(w);
  if (family && !isAtDimensionCap(next, "family", family.id, dimension)) {
    next = recordMasteryEvent(next, "family", family.id, dimension);
  }
  return next;
}

/** Apply gated mastery credit with fractional accumulator. */
export function applyGatedWordMastery(opts: {
  mastery: PhonicsMasteryState;
  integrity: MasteryIntegrityState;
  word: string;
  dimension: MasteryDimension;
  activity: MasteryActivity;
  passed: boolean;
  accuracy?: number;
  confidence?: number;
  attemptNumber?: number;
  now?: number;
}): {
  mastery: PhonicsMasteryState;
  integrity: MasteryIntegrityState;
  verdict: MasteryAttemptVerdict;
} {
  const input: MasteryAttemptInput = {
    activity: opts.activity,
    targetType: "word",
    targetId: opts.word,
    dimension: opts.dimension,
    passed: opts.passed,
    accuracy: opts.accuracy,
    confidence: opts.confidence,
    attemptNumber: opts.attemptNumber,
    now: opts.now,
  };

  const { integrity: nextIntegrity, verdict } = evaluateMasteryAttempt(
    opts.integrity,
    opts.mastery,
    input,
  );

  if (!verdict.appliesMastery) {
    return { mastery: opts.mastery, integrity: nextIntegrity, verdict };
  }

  const pKey = pendingKey("word", opts.word, opts.dimension);
  const pending = (nextIntegrity.pendingCredits[pKey] ?? 0) + verdict.creditWeight;
  let mastery = opts.mastery;
  let remaining = pending;

  while (remaining >= 1 && !isAtDimensionCap(mastery, "word", opts.word, opts.dimension)) {
    mastery = recordWordMasteryOnce(mastery, opts.word, opts.dimension);
    remaining -= 1;
  }

  const integrity: MasteryIntegrityState = {
    ...nextIntegrity,
    pendingCredits: { ...nextIntegrity.pendingCredits, [pKey]: remaining },
  };

  return { mastery, integrity, verdict };
}

/** Certification helper — bounded score after exploit simulation. */
export function maxWordScoreAfterExploit(mastery: PhonicsMasteryState, word: string): number {
  return mastery.words[word.trim().toLowerCase()]?.score ?? 0;
}

export function isWordMasteredViaExploit(mastery: PhonicsMasteryState, word: string): boolean {
  return mastery.words[word.trim().toLowerCase()]?.isMastered === true;
}
