import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  speechCoachV2MonthlyCostUsageTable,
  speechCoachV2SessionTokenUsageTable,
} from "@workspace/db";
import {
  estimateRealtimeCostUsd,
  mergeRealtimeUsageDelta,
  percentile,
  type RealtimeCostEstimate,
  type RealtimeUsageDelta,
} from "@workspace/speech-coach-v2";
import { assertActiveSessionForToken } from "./speechCoachV2ActiveSessionService.js";

function utcMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

function resolveUsdToInr(): number {
  const raw = Number(process.env.SPEECH_COACH_V2_USD_INR ?? 85);
  return Number.isFinite(raw) && raw > 0 ? raw : 85;
}

function estimateDeltaCost(delta: RealtimeUsageDelta): RealtimeCostEstimate {
  return estimateRealtimeCostUsd(delta, resolveUsdToInr());
}

export interface RecordSpeechCoachV2TokenUsageInput {
  userId: string;
  childId: number;
  sessionId: string;
  tabLockToken: string;
  delta: RealtimeUsageDelta;
  responseCount: number;
  model?: string | null;
}

export async function recordSpeechCoachV2TokenUsage(
  input: RecordSpeechCoachV2TokenUsageInput,
): Promise<{
  sessionTotals: RealtimeUsageDelta;
  sessionCostInr: number;
  sessionCostUsd: number;
}> {
  await assertActiveSessionForToken({
    userId: input.userId,
    childId: input.childId,
    sessionId: input.sessionId,
    tabLockToken: input.tabLockToken,
  });

  const deltaCost = estimateDeltaCost(input.delta);
  const month = utcMonthKey();
  const now = new Date();

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(speechCoachV2SessionTokenUsageTable)
      .where(eq(speechCoachV2SessionTokenUsageTable.sessionId, input.sessionId))
      .limit(1);

    const existing = existingRows[0];
    let sessionTotals: RealtimeUsageDelta;
    let sessionCostUsd: number;
    let sessionCostInr: number;
    let isNewSession = false;

    if (existing) {
      sessionTotals = mergeRealtimeUsageDelta(
        {
          inputTokens: existing.inputTokens,
          outputTokens: existing.outputTokens,
          totalTokens: existing.totalTokens,
          inputAudioTokens: existing.inputAudioTokens,
          outputAudioTokens: existing.outputAudioTokens,
          cachedInputTokens: existing.cachedInputTokens,
          inputTextTokens: existing.inputTextTokens,
          outputTextTokens: existing.outputTextTokens,
        },
        input.delta,
      );
      sessionCostUsd = existing.estimatedCostUsd + deltaCost.costUsd;
      sessionCostInr = existing.estimatedCostInr + deltaCost.costInr;

      await tx
        .update(speechCoachV2SessionTokenUsageTable)
        .set({
          inputTokens: sessionTotals.inputTokens,
          outputTokens: sessionTotals.outputTokens,
          totalTokens: sessionTotals.totalTokens,
          inputAudioTokens: sessionTotals.inputAudioTokens,
          outputAudioTokens: sessionTotals.outputAudioTokens,
          cachedInputTokens: sessionTotals.cachedInputTokens,
          inputTextTokens: sessionTotals.inputTextTokens,
          outputTextTokens: sessionTotals.outputTextTokens,
          responseCount: existing.responseCount + input.responseCount,
          model: input.model ?? existing.model,
          estimatedCostUsd: sessionCostUsd,
          estimatedCostInr: sessionCostInr,
          updatedAt: now,
        })
        .where(eq(speechCoachV2SessionTokenUsageTable.sessionId, input.sessionId));
    } else {
      isNewSession = true;
      sessionTotals = input.delta;
      sessionCostUsd = deltaCost.costUsd;
      sessionCostInr = deltaCost.costInr;

      await tx.insert(speechCoachV2SessionTokenUsageTable).values({
        sessionId: input.sessionId,
        userId: input.userId,
        childId: input.childId,
        inputTokens: sessionTotals.inputTokens,
        outputTokens: sessionTotals.outputTokens,
        totalTokens: sessionTotals.totalTokens,
        inputAudioTokens: sessionTotals.inputAudioTokens,
        outputAudioTokens: sessionTotals.outputAudioTokens,
        cachedInputTokens: sessionTotals.cachedInputTokens,
        inputTextTokens: sessionTotals.inputTextTokens,
        outputTextTokens: sessionTotals.outputTextTokens,
        responseCount: input.responseCount,
        model: input.model ?? null,
        estimatedCostUsd: sessionCostUsd,
        estimatedCostInr: sessionCostInr,
        createdAt: now,
        updatedAt: now,
      });
    }

    const monthRows = await tx
      .select()
      .from(speechCoachV2MonthlyCostUsageTable)
      .where(
        and(
          eq(speechCoachV2MonthlyCostUsageTable.userId, input.userId),
          eq(speechCoachV2MonthlyCostUsageTable.childId, input.childId),
          eq(speechCoachV2MonthlyCostUsageTable.month, month),
        ),
      )
      .limit(1);

    const monthExisting = monthRows[0];
    if (monthExisting) {
      await tx
        .update(speechCoachV2MonthlyCostUsageTable)
        .set({
          sessionCount: monthExisting.sessionCount + (isNewSession ? 1 : 0),
          inputTokens: monthExisting.inputTokens + input.delta.inputTokens,
          outputTokens: monthExisting.outputTokens + input.delta.outputTokens,
          totalTokens: monthExisting.totalTokens + input.delta.totalTokens,
          estimatedCostUsd: monthExisting.estimatedCostUsd + deltaCost.costUsd,
          estimatedCostInr: monthExisting.estimatedCostInr + deltaCost.costInr,
          updatedAt: now,
        })
        .where(eq(speechCoachV2MonthlyCostUsageTable.id, monthExisting.id));
    } else {
      await tx.insert(speechCoachV2MonthlyCostUsageTable).values({
        userId: input.userId,
        childId: input.childId,
        month,
        sessionCount: 1,
        inputTokens: input.delta.inputTokens,
        outputTokens: input.delta.outputTokens,
        totalTokens: input.delta.totalTokens,
        estimatedCostUsd: deltaCost.costUsd,
        estimatedCostInr: deltaCost.costInr,
        updatedAt: now,
      });
    }

    return {
      sessionTotals,
      sessionCostInr: Math.round(sessionCostInr * 100) / 100,
      sessionCostUsd: Math.round(sessionCostUsd * 1_000_000) / 1_000_000,
    };
  });
}

export interface SpeechCoachV2CostAnalyticsUserRow {
  userId: string;
  sessionCount: number;
  totalTokens: number;
  estimatedCostInr: number;
  estimatedCostUsd: number;
}

export interface SpeechCoachV2CostAnalyticsDashboard {
  days: number;
  totalSessions: number;
  totalCostInr: number;
  totalCostUsd: number;
  averageCostInrPerUser: number;
  p95CostInrPerUser: number;
  worstUserCostInr: number;
  topExpensiveUsers: SpeechCoachV2CostAnalyticsUserRow[];
}

export async function computeSpeechCoachV2CostAnalytics(
  days: number,
): Promise<SpeechCoachV2CostAnalyticsDashboard> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const perUserRows = await db
    .select({
      userId: speechCoachV2SessionTokenUsageTable.userId,
      sessionCount: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${speechCoachV2SessionTokenUsageTable.totalTokens}), 0)::int`,
      estimatedCostInr: sql<number>`coalesce(sum(${speechCoachV2SessionTokenUsageTable.estimatedCostInr}), 0)::float`,
      estimatedCostUsd: sql<number>`coalesce(sum(${speechCoachV2SessionTokenUsageTable.estimatedCostUsd}), 0)::float`,
    })
    .from(speechCoachV2SessionTokenUsageTable)
    .where(gte(speechCoachV2SessionTokenUsageTable.createdAt, since))
    .groupBy(speechCoachV2SessionTokenUsageTable.userId);

  const totals = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      totalCostInr: sql<number>`coalesce(sum(${speechCoachV2SessionTokenUsageTable.estimatedCostInr}), 0)::float`,
      totalCostUsd: sql<number>`coalesce(sum(${speechCoachV2SessionTokenUsageTable.estimatedCostUsd}), 0)::float`,
    })
    .from(speechCoachV2SessionTokenUsageTable)
    .where(gte(speechCoachV2SessionTokenUsageTable.createdAt, since));

  const userCosts = perUserRows.map((row) => Number(row.estimatedCostInr) || 0);
  const totalSessions = Number(totals[0]?.totalSessions ?? 0);
  const totalCostInr = Math.round((Number(totals[0]?.totalCostInr ?? 0)) * 100) / 100;
  const totalCostUsd = Math.round((Number(totals[0]?.totalCostUsd ?? 0)) * 1_000_000) / 1_000_000;

  const topExpensiveUsers = [...perUserRows]
    .sort((a, b) => Number(b.estimatedCostInr) - Number(a.estimatedCostInr))
    .slice(0, 20)
    .map((row) => ({
      userId: row.userId,
      sessionCount: Number(row.sessionCount) || 0,
      totalTokens: Number(row.totalTokens) || 0,
      estimatedCostInr: Math.round(Number(row.estimatedCostInr) * 100) / 100,
      estimatedCostUsd: Math.round(Number(row.estimatedCostUsd) * 1_000_000) / 1_000_000,
    }));

  const averageCostInrPerUser =
    userCosts.length > 0
      ? Math.round((userCosts.reduce((sum, v) => sum + v, 0) / userCosts.length) * 100) / 100
      : 0;

  return {
    days,
    totalSessions,
    totalCostInr,
    totalCostUsd,
    averageCostInrPerUser,
    p95CostInrPerUser: Math.round(percentile(userCosts, 95) * 100) / 100,
    worstUserCostInr: Math.round((userCosts.length > 0 ? Math.max(...userCosts) : 0) * 100) / 100,
    topExpensiveUsers,
  };
}
