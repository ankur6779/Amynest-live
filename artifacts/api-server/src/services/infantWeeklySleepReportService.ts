/**
 * Premium weekly infant sleep coaching report — aggregates nap_sessions + AI summary.
 */
import { and, desc, eq, gte } from "drizzle-orm";
import { getIsoWeekKey } from "@workspace/infant-hub";
import { db, aiCacheTable, napSessionsTable } from "@workspace/db";
import { runInfantSleepWeeklySummary } from "./domain-ai/infant-runners.js";
import { logInfantAiCost } from "./infantAiCostMonitor.js";
import { persistInfantProductAnalyticsEvent } from "./infantAnalyticsIngestService.js";

export const INFANT_SLEEP_WEEKLY_CACHE_NS = "infant_sleep_weekly_v1";

export type WeeklySleepStats = {
  weekKey: number;
  totalSessions: number;
  napCount: number;
  nightCount: number;
  avgDurationMin: number;
  totalSleepMin: number;
  daysWithData: number;
};

export type WeeklySleepReport = {
  weekKey: number;
  generatedAt: string;
  cached: boolean;
  stats: WeeklySleepStats;
  summary: string;
  highlights: string[];
  nextSteps: string[];
};

function cacheKey(childId: number, weekKey: number): string {
  return `${INFANT_SLEEP_WEEKLY_CACHE_NS}:${childId}:${weekKey}`;
}

export async function aggregateWeeklySleepStats(
  childId: number,
  weekKey = getIsoWeekKey(),
): Promise<WeeklySleepStats> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const rows = await db
    .select()
    .from(napSessionsTable)
    .where(and(eq(napSessionsTable.childId, childId), gte(napSessionsTable.startedAt, since)))
    .orderBy(desc(napSessionsTable.startedAt));

  let napCount = 0;
  let nightCount = 0;
  let totalMs = 0;
  const daySet = new Set<string>();

  for (const row of rows) {
    if (row.kind === "night") nightCount++;
    else napCount++;
    const ms = row.durationMs > 0 ? row.durationMs : 0;
    totalMs += ms;
    daySet.add(row.startedAt.toISOString().slice(0, 10));
  }

  const totalSessions = rows.length;
  const avgDurationMin =
    totalSessions > 0 ? Math.round(totalMs / totalSessions / 60_000) : 0;

  return {
    weekKey,
    totalSessions,
    napCount,
    nightCount,
    avgDurationMin,
    totalSleepMin: Math.round(totalMs / 60_000),
    daysWithData: daySet.size,
  };
}

export async function generateWeeklySleepReport(input: {
  userId: string;
  childId: number;
  childName: string;
  ageMonths: number;
}): Promise<WeeklySleepReport> {
  const weekKey = getIsoWeekKey();
  const key = cacheKey(input.childId, weekKey);

  const cachedRows = await db
    .select()
    .from(aiCacheTable)
    .where(eq(aiCacheTable.cacheKey, key))
    .limit(1);
  const cached = cachedRows[0];
  if (cached?.response) {
    logInfantAiCost({
      job: "infant_sleep_weekly_report",
      userId: input.userId,
      childId: input.childId,
      estimatedTokens: 0,
      cached: true,
    });
    return {
      ...(cached.response as WeeklySleepReport),
      cached: true,
    };
  }

  const stats = await aggregateWeeklySleepStats(input.childId, weekKey);
  const statsJson = JSON.stringify(stats);

  const ai = await runInfantSleepWeeklySummary({
    userId: input.userId,
    childId: input.childId,
    childName: input.childName,
    ageMonths: input.ageMonths,
    statsJson,
  });

  const report: WeeklySleepReport = {
    weekKey,
    generatedAt: new Date().toISOString(),
    cached: false,
    stats,
    summary:
      ai?.summary ??
      (stats.totalSessions === 0
        ? "Log a few naps this week to unlock personalized sleep coaching."
        : `This week: ${stats.napCount} naps logged across ${stats.daysWithData} days.`),
    highlights: ai?.highlights ?? [],
    nextSteps: ai?.nextSteps ?? [],
  };

  await db
    .insert(aiCacheTable)
    .values({
      cacheKey: key,
      namespace: INFANT_SLEEP_WEEKLY_CACHE_NS,
      input: { childId: input.childId, weekKey, stats },
      response: report,
    })
    .onConflictDoUpdate({
      target: aiCacheTable.cacheKey,
      set: { input: { childId: input.childId, weekKey, stats }, response: report, createdAt: new Date() },
    });

  void persistInfantProductAnalyticsEvent({
    userId: input.userId,
    childId: input.childId,
    childAgeMonths: input.ageMonths,
    event: "infant_sleep_coach_generated",
    properties: { weekKey, cached: false },
  }).catch(() => undefined);

  return report;
}
