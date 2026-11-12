import { and, desc, eq, gte } from "drizzle-orm";
import {
  db,
  speechCoachV2ActiveSessionsTable,
  speechCoachV2DailyUsageTable,
  speechCoachV2MonthlyUsageTable,
  speechCoachV2SessionsTable,
  speechCoachV2StreaksTable,
  speechCoachV2TurnLogTable,
} from "@workspace/db";
import {
  advancePhaseMastery,
  averageScore,
  badgesFromSession,
  buildParentDashboard,
  evaluateSpeechResponse,
  getCurrentExercise,
  pointsForScore,
  recordTurnResult,
  sanitizeChildTranscript,
  shouldAdvancePhaseMastery,
  starsForScore,
  SPEECH_COACH_V2_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS,
  utcDateKey,
  type PersistedSessionState,
  type SpeechCoachV2EvaluationScores,
  type SpeechCoachV2ParentDashboard,
  type SpeechTimingMetadata,
} from "@workspace/speech-coach-v2";
import {
  terminateActiveSession,
  updateSessionState,
  validateAndTouchSession,
} from "./speechCoachV2ActiveSessionService.js";

function utcMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export async function getDailyUsageSeconds(
  userId: string,
  childId: number,
  day = utcDateKey(),
): Promise<number> {
  const rows = await db
    .select({ secondsUsed: speechCoachV2DailyUsageTable.secondsUsed })
    .from(speechCoachV2DailyUsageTable)
    .where(
      and(
        eq(speechCoachV2DailyUsageTable.userId, userId),
        eq(speechCoachV2DailyUsageTable.childId, childId),
        eq(speechCoachV2DailyUsageTable.day, day),
      ),
    )
    .limit(1);
  return rows[0]?.secondsUsed ?? 0;
}

export async function getMonthlyUsageSeconds(
  userId: string,
  childId: number,
  month = utcMonthKey(),
): Promise<number> {
  const rows = await db
    .select({ secondsUsed: speechCoachV2MonthlyUsageTable.secondsUsed })
    .from(speechCoachV2MonthlyUsageTable)
    .where(
      and(
        eq(speechCoachV2MonthlyUsageTable.userId, userId),
        eq(speechCoachV2MonthlyUsageTable.childId, childId),
        eq(speechCoachV2MonthlyUsageTable.month, month),
      ),
    )
    .limit(1);
  return rows[0]?.secondsUsed ?? 0;
}

async function loadActiveSessionState(
  userId: string,
  sessionId: string,
): Promise<PersistedSessionState> {
  const rows = await db
    .select({ sessionStateJson: speechCoachV2ActiveSessionsTable.sessionStateJson })
    .from(speechCoachV2ActiveSessionsTable)
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.sessionId, sessionId),
        eq(speechCoachV2ActiveSessionsTable.userId, userId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("session_not_found");
  return rows[0].sessionStateJson as unknown as PersistedSessionState;
}

export async function recordTurnEvaluation(input: {
  userId: string;
  childId: number;
  sessionId: string;
  tabLockToken: string;
  exerciseId: string;
  expected: string;
  transcript: string;
  rawTranscript?: string;
  timing?: SpeechTimingMetadata;
}): Promise<{
  evaluation: ReturnType<typeof evaluateSpeechResponse>;
  sessionState: PersistedSessionState;
  starsEarned: number;
  pointsEarned: number;
}> {
  const safety = sanitizeChildTranscript(input.rawTranscript ?? input.transcript);
  if (safety.blocked) throw new Error("unsafe_transcript");

  await validateAndTouchSession({
    userId: input.userId,
    childId: input.childId,
    sessionId: input.sessionId,
    tabLockToken: input.tabLockToken,
  });

  const sessionState = await loadActiveSessionState(input.userId, input.sessionId);
  const exercise = getCurrentExercise(sessionState);
  if (!exercise || exercise.id !== input.exerciseId) {
    throw new Error("exercise_mismatch");
  }

  const result = evaluateSpeechResponse({
    expected: input.expected,
    transcript: safety.text || input.transcript,
    rawTranscript: input.rawTranscript ?? input.transcript,
    timing: input.timing,
  });

  await db.insert(speechCoachV2TurnLogTable).values({
    userId: input.userId,
    childId: input.childId,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    expected: input.expected,
    transcript: safety.text || input.transcript,
    rawTranscript: input.rawTranscript ?? input.transcript,
    accuracyScore: result.pronunciationEstimate,
    fluencyScore: result.fluencyScore,
    confidenceScore: result.confidenceScore,
    completionScore: result.completionScore,
    overallScore: result.overallScore,
    transcriptAccuracy: result.transcriptAccuracy,
    pronunciationEstimate: result.pronunciationEstimate,
    scoringConfidence: result.scoringConfidence,
    speakingRateScore: result.speakingRateScore,
  });

  const stars = starsForScore(result.overallScore);
  const points = pointsForScore(result.overallScore);

  let nextState = recordTurnResult(
    sessionState,
    result,
    result.wordsSpoken,
    result.sentencesCompleted,
    stars,
    points,
  );

  if (shouldAdvancePhaseMastery(nextState)) {
    nextState = advancePhaseMastery(nextState);
  }

  await updateSessionState({
    userId: input.userId,
    childId: input.childId,
    sessionId: input.sessionId,
    tabLockToken: input.tabLockToken,
    sessionState: nextState,
  });

  return { evaluation: result, sessionState: nextState, starsEarned: stars, pointsEarned: points };
}

async function updateStreak(userId: string, childId: number, day = utcDateKey()): Promise<{
  dailyStreak: number;
  weeklyStreak: number;
}> {
  const rows = await db
    .select()
    .from(speechCoachV2StreaksTable)
    .where(
      and(
        eq(speechCoachV2StreaksTable.userId, userId),
        eq(speechCoachV2StreaksTable.childId, childId),
      ),
    )
    .limit(1);

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = utcDateKey(yesterday);

  if (!rows[0]) {
    await db.insert(speechCoachV2StreaksTable).values({
      userId,
      childId,
      dailyStreak: 1,
      weeklyStreak: 1,
      lastPracticeDay: day,
    });
    return { dailyStreak: 1, weeklyStreak: 1 };
  }

  const last = rows[0].lastPracticeDay;
  let dailyStreak = rows[0].dailyStreak;
  let weeklyStreak = rows[0].weeklyStreak;
  if (last === day) return { dailyStreak, weeklyStreak };

  if (last === yesterdayKey) {
    dailyStreak += 1;
    weeklyStreak = Math.min(7, weeklyStreak + 1);
  } else {
    dailyStreak = 1;
    weeklyStreak = 1;
  }

  await db
    .update(speechCoachV2StreaksTable)
    .set({ dailyStreak, weeklyStreak, lastPracticeDay: day, updatedAt: new Date() })
    .where(eq(speechCoachV2StreaksTable.id, rows[0].id));

  return { dailyStreak, weeklyStreak };
}

export async function completeSessionServerAuthoritative(input: {
  userId: string;
  childId: number;
  sessionId: string;
  tabLockToken: string;
}): Promise<{
  dailyStreak: number;
  weeklyStreak: number;
  badgesEarned: string[];
  durationSeconds: number;
  starsEarned: number;
  pointsEarned: number;
}> {
  const existingCompleted = await db
    .select()
    .from(speechCoachV2SessionsTable)
    .where(
      and(
        eq(speechCoachV2SessionsTable.sessionId, input.sessionId),
        eq(speechCoachV2SessionsTable.userId, input.userId),
      ),
    )
    .limit(1);

  if (existingCompleted[0]) {
    const row = existingCompleted[0];
    const streakRows = await db
      .select()
      .from(speechCoachV2StreaksTable)
      .where(
        and(
          eq(speechCoachV2StreaksTable.userId, input.userId),
          eq(speechCoachV2StreaksTable.childId, input.childId),
        ),
      )
      .limit(1);
    return {
      dailyStreak: streakRows[0]?.dailyStreak ?? 0,
      weeklyStreak: streakRows[0]?.weeklyStreak ?? 0,
      badgesEarned: row.badgesEarned ?? [],
      durationSeconds: row.durationSeconds,
      starsEarned: row.starsEarned,
      pointsEarned: row.pointsEarned,
    };
  }

  await validateAndTouchSession({
    userId: input.userId,
    childId: input.childId,
    sessionId: input.sessionId,
    tabLockToken: input.tabLockToken,
  }).catch(() => undefined);

  const durationSeconds = await terminateActiveSession({
    userId: input.userId,
    childId: input.childId,
    sessionId: input.sessionId,
    status: "completed",
  });

  const turns = await db
    .select()
    .from(speechCoachV2TurnLogTable)
    .where(
      and(
        eq(speechCoachV2TurnLogTable.sessionId, input.sessionId),
        eq(speechCoachV2TurnLogTable.userId, input.userId),
      ),
    );

  const scores: SpeechCoachV2EvaluationScores[] = turns.map((t) => ({
    transcriptAccuracy: t.transcriptAccuracy ?? t.accuracyScore,
    pronunciationEstimate: t.pronunciationEstimate ?? t.accuracyScore,
    fluencyScore: t.fluencyScore,
    speakingRateScore: t.speakingRateScore ?? t.fluencyScore,
    confidenceScore: t.confidenceScore,
    completionScore: t.completionScore,
    overallScore: t.overallScore,
    scoringConfidence:
      (t.scoringConfidence as SpeechCoachV2EvaluationScores["scoringConfidence"]) ?? "MEDIUM",
    accuracyScore: t.pronunciationEstimate ?? t.accuracyScore,
  }));

  const wordsSpoken = turns.reduce(
    (sum, t) => sum + t.transcript.split(/\s+/).filter(Boolean).length,
    0,
  );
  const sentencesCompleted = turns.filter((t) => t.completionScore >= 65).length;

  let starsEarned = 0;
  let pointsEarned = 0;
  for (const s of scores) {
    starsEarned += starsForScore(s.overallScore);
    pointsEarned += pointsForScore(s.overallScore);
  }

  const sessionRow = await db
    .select()
    .from(speechCoachV2ActiveSessionsTable)
    .where(eq(speechCoachV2ActiveSessionsTable.sessionId, input.sessionId))
    .limit(1);

  const sessionState = (sessionRow[0]?.sessionStateJson ?? {}) as unknown as PersistedSessionState;
  const completedConfidenceChallenge =
    sessionState.phase === "confidence_challenge" || sessionState.phaseSuccesses > 0;

  const badgesEarned = badgesFromSession({
    scores,
    wordsSpoken,
    sentencesCompleted,
    completedConfidenceChallenge,
  });

  const avg = (key: "overallScore" | "pronunciationEstimate" | "fluencyScore" | "confidenceScore") =>
    averageScore(scores.map((s) => s[key]));

  const completionRate =
    scores.length === 0
      ? 0
      : Math.round((scores.filter((s) => s.completionScore >= 65).length / scores.length) * 100);

  await db.insert(speechCoachV2SessionsTable).values({
    sessionId: input.sessionId,
    userId: input.userId,
    childId: input.childId,
    ageBand: sessionState.ageBand ?? sessionRow[0]?.ageBand ?? "4-5",
    durationSeconds,
    wordsSpoken,
    sentencesCompleted,
    starsEarned,
    pointsEarned,
    averageOverallScore: avg("overallScore"),
    averageAccuracy: avg("pronunciationEstimate"),
    averageFluency: avg("fluencyScore"),
    averageConfidence: avg("confidenceScore"),
    completionRate,
    badgesEarned,
    phaseReached: sessionState.phase ?? "celebration",
    scoresJson: scores,
  });

  const streaks = await updateStreak(input.userId, input.childId);
  return { ...streaks, badgesEarned, durationSeconds, starsEarned, pointsEarned };
}

export async function getParentDashboard(
  userId: string,
  childId: number,
): Promise<SpeechCoachV2ParentDashboard> {
  const todaySeconds = await getDailyUsageSeconds(userId, childId);
  const monthSeconds = await getMonthlyUsageSeconds(userId, childId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const sessions = await db
    .select()
    .from(speechCoachV2SessionsTable)
    .where(
      and(
        eq(speechCoachV2SessionsTable.userId, userId),
        eq(speechCoachV2SessionsTable.childId, childId),
        gte(speechCoachV2SessionsTable.completedAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(speechCoachV2SessionsTable.completedAt))
    .limit(30);

  const turns = await db
    .select()
    .from(speechCoachV2TurnLogTable)
    .where(
      and(
        eq(speechCoachV2TurnLogTable.userId, userId),
        eq(speechCoachV2TurnLogTable.childId, childId),
        gte(speechCoachV2TurnLogTable.createdAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(speechCoachV2TurnLogTable.createdAt))
    .limit(100);

  const recentOverall = turns.slice(0, 14).map((t) => t.overallScore);
  const recentAccuracy = turns.slice(0, 14).map((t) => t.pronunciationEstimate ?? t.accuracyScore);
  const recentFluency = turns.slice(0, 14).map((t) => t.fluencyScore);
  const recentConfidence = turns.slice(0, 14).map((t) => t.confidenceScore);
  const recentSpeakingRate = turns.slice(0, 14).map((t) => t.speakingRateScore ?? t.fluencyScore);
  const priorWeek = turns.slice(14, 28).map((t) => t.overallScore);
  const priorMonth = turns.slice(28, 56).map((t) => t.overallScore);

  const wordsPracticed = sessions.reduce((sum, s) => sum + s.wordsSpoken, 0);

  const streakRows = await db
    .select()
    .from(speechCoachV2StreaksTable)
    .where(
      and(
        eq(speechCoachV2StreaksTable.userId, userId),
        eq(speechCoachV2StreaksTable.childId, childId),
      ),
    )
    .limit(1);

  const allBadges = new Set<string>();
  for (const s of sessions) {
    for (const b of s.badgesEarned ?? []) allBadges.add(b);
  }

  return buildParentDashboard({
    todayPracticeSeconds: todaySeconds,
    monthPracticeSeconds: monthSeconds,
    wordsPracticed,
    recentOverallScores: recentOverall,
    recentAccuracyScores: recentAccuracy,
    recentFluencyScores: recentFluency,
    recentConfidenceScores: recentConfidence,
    recentSpeakingRateScores: recentSpeakingRate,
    priorWeekOverallScores: priorWeek,
    priorMonthOverallScores: priorMonth,
    dailyStreak: streakRows[0]?.dailyStreak ?? 0,
    weeklyStreak: streakRows[0]?.weeklyStreak ?? 0,
    badges: [...allBadges],
  });
}

export { SPEECH_COACH_V2_DAILY_LIMIT_SECONDS, SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS };
