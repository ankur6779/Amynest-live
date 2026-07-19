import {
  generateChallenge,
  getLevel,
  scoreAnswer,
  summarizeSession,
  type LevelId,
} from "./index.js";

export type ChallengeAnswerPayload = {
  level: LevelId;
  seed: number;
  /** Numeric answers submitted per question (same order as generateChallenge). */
  answers: number[];
  /** Elapsed ms per question. */
  elapsedMs: number[];
};

export type ChallengeVerifyResult = {
  ok: boolean;
  accuracyPct: number;
  totalPoints: number;
  correct: number;
  totalQuestions: number;
  passed: boolean;
  reason?: string;
};

/** Pure server/client-shared verifier for a challenge session. */
export function verifyChallengeAnswers(payload: ChallengeAnswerPayload): ChallengeVerifyResult {
  const def = getLevel(payload.level);
  const problems = generateChallenge(payload.level, payload.seed);
  if (
    payload.answers.length !== problems.length ||
    payload.elapsedMs.length !== problems.length
  ) {
    return {
      ok: false,
      accuracyPct: 0,
      totalPoints: 0,
      correct: 0,
      totalQuestions: problems.length,
      passed: false,
      reason: "answer_count_mismatch",
    };
  }

  const results = problems.map((p, i) => {
    const correct = payload.answers[i] === p.answer;
    const elapsed = Math.max(0, Math.min(def.challengeSecondsPerQ * 1000 + 5_000, payload.elapsedMs[i] ?? 0));
    const score = scoreAnswer({
      correct,
      elapsedMs: elapsed,
      limitMs: def.challengeSecondsPerQ * 1000,
      fastBonusFraction: def.fastBonusFraction,
    });
    return { correct, points: score.points };
  });

  const summary = summarizeSession(payload.level, results);
  return {
    ok: true,
    accuracyPct: summary.accuracyPct,
    totalPoints: summary.totalPoints,
    correct: summary.correct,
    totalQuestions: summary.totalQuestions,
    passed: summary.passed,
  };
}
