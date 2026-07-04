import { and, eq, gte, sql } from "drizzle-orm";
import {
  childrenTable,
  db,
  speechPracticeLogTable,
  userRetentionTable,
  type WeeklySummaryCache,
} from "@workspace/db";
import { computeParentingScore } from "@workspace/retention-system";
import { buildInsights } from "./insightsService";
import { buildWeeklySummary } from "./retentionSystemService";
import { logger } from "../lib/logger";

function weekKey(now = new Date()): string {
  const d = new Date(now);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export async function aggregateWeeklyRetentionStats(
  userId: string,
): Promise<Omit<WeeklySummaryCache, "weekKey" | "generatedAt">> {
  const insights = await buildInsights({ userId, range: "week" });
  const perChild = insights.perChild;

  const routineCompletionPct =
    perChild.length > 0
      ? Math.round(
          perChild.reduce((sum, c) => sum + c.routineCompletionRate, 0) / perChild.length,
        )
      : 0;

  const learningMinutes = Math.max(
    0,
    perChild.reduce((sum, c) => sum + c.activeDays * 12, 0),
  );

  const storiesCompleted = perChild.reduce(
    (sum, c) => sum + Math.min(c.milestoneCount, c.behaviorsCount),
    0,
  );

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [speechRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(speechPracticeLogTable)
    .where(
      and(
        eq(speechPracticeLogTable.userId, userId),
        gte(speechPracticeLogTable.attemptedAt, weekAgo),
      ),
    );

  const speechSessions = speechRow?.count ?? 0;

  const nutritionScore = Math.min(
    100,
    Math.round(insights.summary.positiveRateThisPeriod * 0.6 + routineCompletionPct * 0.4),
  );

  const [retention] = await db
    .select()
    .from(userRetentionTable)
    .where(eq(userRetentionTable.userId, userId))
    .limit(1);

  const goalsComplete = retention
    ? Object.values(retention.dailyGoals).filter(Boolean).length
    : 0;

  const parentingScore = computeParentingScore({
    streak: retention?.currentStreak ?? 0,
    goalsComplete,
    goalsTotal: 4,
    routineCompletionPct,
  });

  return {
    routineCompletionPct,
    learningMinutes,
    storiesCompleted,
    speechSessions,
    nutritionScore,
    parentingScore,
  };
}

export async function generateWeeklySummaryForUser(userId: string): Promise<WeeklySummaryCache | null> {
  const children = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .limit(1);
  if (children.length === 0) return null;

  const stats = await aggregateWeeklyRetentionStats(userId);
  return buildWeeklySummary(userId, stats);
}

export async function dispatchRetentionWeeklySummaries(): Promise<{
  attempted: number;
  generated: number;
  skipped: number;
  failed: number;
}> {
  const rows = await db
    .selectDistinct({ userId: childrenTable.userId })
    .from(childrenTable);

  const userIds = rows.map((r) => r.userId);
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  const currentWeek = weekKey();

  for (const userId of userIds) {
    if (!userId) {
      skipped++;
      continue;
    }
    try {
      const [existing] = await db
        .select({ cache: userRetentionTable.weeklySummaryCache })
        .from(userRetentionTable)
        .where(eq(userRetentionTable.userId, userId))
        .limit(1);

      if (existing?.cache?.weekKey === currentWeek) {
        skipped++;
        continue;
      }

      const summary = await generateWeeklySummaryForUser(userId);
      if (summary) generated++;
      else skipped++;
    } catch (err) {
      failed++;
      logger.error(
        { err, userId: userId ?? "unknown" },
        "retention weekly summary generation failed for user",
      );
    }
  }

  logger.info(
    { attempted: userIds.length, generated, skipped, failed, weekKey: currentWeek },
    "retention weekly summary batch complete",
  );

  return { attempted: userIds.length, generated, skipped, failed };
}
