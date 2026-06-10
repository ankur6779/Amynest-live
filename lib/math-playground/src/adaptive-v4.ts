import {
  deriveAdaptivityTier,
  recordPlaygroundSession,
} from "./adaptive";
import type {
  AdaptivityTier,
  PlaygroundActivityId,
  PlaygroundLearningState,
  PlaygroundSessionRecordV4,
} from "./types";

const FAST_RESPONSE_MS = 8_000;
const HIGH_VOICE_CONFIDENCE = 0.75;
const SLOW_RESPONSE_MS = 20_000;
const LOW_VOICE_CONFIDENCE = 0.45;

function recentActivitySessions(
  learning: PlaygroundLearningState,
  activityId: PlaygroundActivityId,
  limit = 5,
) {
  return learning.sessionHistory
    .filter((r) => r.activityId === activityId)
    .slice(0, limit);
}

function isFastLearnerSession(record: PlaygroundSessionRecordV4): boolean {
  if (!record.success) return false;
  const fastResponse =
    record.responseTimeMs === undefined || record.responseTimeMs <= FAST_RESPONSE_MS;
  const lowRetries = (record.retryCount ?? 0) <= 1;
  const confident =
    record.voiceConfidence === undefined || record.voiceConfidence >= HIGH_VOICE_CONFIDENCE;
  const fewHints = record.hintsUsed <= 1;
  return fastResponse && lowRetries && confident && fewHints;
}

function isStrugglingSession(record: PlaygroundSessionRecordV4): boolean {
  const slowResponse = (record.responseTimeMs ?? 0) >= SLOW_RESPONSE_MS;
  const manyRetries = (record.retryCount ?? 0) >= 2;
  const lowConfidence =
    record.voiceConfidence !== undefined && record.voiceConfidence < LOW_VOICE_CONFIDENCE;
  const hintHeavy = record.hintsUsed >= 2;
  return !record.success || slowResponse || manyRetries || lowConfidence || hintHeavy;
}

/**
 * Extends base adaptive tier with Phase 4 signals (response time, retries, voice confidence).
 * Falls back to deriveAdaptivityTier when v4 signals are absent.
 */
export function deriveAdaptivityTierV4(
  activityId: PlaygroundActivityId,
  learning: PlaygroundLearningState,
): AdaptivityTier {
  const base = deriveAdaptivityTier(activityId, learning);
  const recent = recentActivitySessions(learning, activityId, 5);
  if (recent.length < 2) return base;

  const hasV4Signals = recent.some(
    (r) =>
      r.responseTimeMs !== undefined ||
      r.voiceConfidence !== undefined ||
      r.retryCount !== undefined ||
      r.playMode !== undefined,
  );
  if (!hasV4Signals) return base;

  const fastCount = recent.filter(isFastLearnerSession).length;
  const struggleCount = recent.filter(isStrugglingSession).length;

  if (base === "ease") return "ease";
  if (struggleCount >= 2) return "ease";
  if (base === "stretch" || (base === "standard" && fastCount >= 3)) return "stretch";
  return "standard";
}

/** Records a session with optional v4 fields; delegates to recordPlaygroundSession. */
export function recordPlaygroundSessionV4(
  learning: PlaygroundLearningState,
  record: PlaygroundSessionRecordV4,
): PlaygroundLearningState {
  return recordPlaygroundSession(learning, record);
}

export function computeSessionCompletionRate(
  learning: PlaygroundLearningState,
  activityId?: PlaygroundActivityId,
): number {
  const sessions = activityId
    ? learning.sessionHistory.filter((r) => r.activityId === activityId)
    : learning.sessionHistory;
  if (sessions.length === 0) return 0;
  const successes = sessions.filter((r) => r.success).length;
  return successes / sessions.length;
}
