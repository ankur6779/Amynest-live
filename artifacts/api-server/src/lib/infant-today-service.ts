/**
 * Aggregates Baby Today card data from infant logs.
 */
import { and, desc, eq, gte } from "drizzle-orm";
import {
  db,
  napSessionsTable,
  infantCareLogsTable,
  infantMilestoneProgressTable,
  vaccinationLogsTable,
  type NapSessionRow,
} from "@workspace/db";
import {
  pickDailyActivity,
  suggestedFeedIntervalMin,
  computeSleepScoreLabel,
  formatSleepScoreLabel,
} from "@workspace/infant-hub";
import {
  getUpcomingVaccinationsWithLog,
  type VaxLogMap,
} from "@workspace/infant-hub";
import { predictNextSleep, buildPredictInputFromHistory } from "./sleepPredict";
import type { NapHistoryEntry } from "./sleepPredict";

function startOfLocalDay(now: Date, tzOffsetMin: number): Date {
  const localMs = now.getTime() - tzOffsetMin * 60_000;
  const local = new Date(localMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + tzOffsetMin * 60_000);
}

function rowsToHistory(rows: NapSessionRow[]): NapHistoryEntry[] {
  return rows.map((r) => ({
    kind: (r.kind === "night" ? "night" : "nap") as "nap" | "night",
    startedAt: r.startedAt.getTime(),
    endedAt: r.endedAt ? r.endedAt.getTime() : undefined,
  }));
}

export type BabyTodayPayload = {
  childId: number;
  childName: string;
  ageMonths: number;
  nextNap: string | null;
  nextFeed: string | null;
  lastSleep: string | null;
  lastFeed: string | null;
  activity: { emoji: string; title: string } | null;
  vaccineStatus: string;
  sleepScore: string;
  milestoneProgressPct: number;
  cryInsightHint: string | null;
};

export async function buildBabyTodayPayload(
  childId: number,
  childName: string,
  ageMonths: number,
  tzOffsetMin = 0,
): Promise<BabyTodayPayload> {
  const now = new Date();
  const dayStart = startOfLocalDay(now, tzOffsetMin);

  const [napRows, feedRows, vaxRows, milestoneRows] = await Promise.all([
    db
      .select()
      .from(napSessionsTable)
      .where(eq(napSessionsTable.childId, childId))
      .orderBy(desc(napSessionsTable.startedAt))
      .limit(30),
    db
      .select()
      .from(infantCareLogsTable)
      .where(
        and(
          eq(infantCareLogsTable.childId, childId),
          gte(
            infantCareLogsTable.loggedAt,
            new Date(now.getTime() - 7 * 24 * 60 * 60_000),
          ),
        ),
      )
      .orderBy(desc(infantCareLogsTable.loggedAt))
      .limit(30),
    db
      .select()
      .from(vaccinationLogsTable)
      .where(eq(vaccinationLogsTable.childId, childId)),
    db
      .select()
      .from(infantMilestoneProgressTable)
      .where(eq(infantMilestoneProgressTable.childId, childId)),
  ]);

  const history = rowsToHistory(napRows);
  const predictInput = buildPredictInputFromHistory(
    history,
    ageMonths,
    Date.now(),
    tzOffsetMin,
  );
  const prediction = predictNextSleep(predictInput);

  const nextNap = prediction?.windowStart
    ? new Date(prediction.windowStart).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const lastNap = napRows[0] ?? null;
  const lastSleep = lastNap
    ? new Date(lastNap.startedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const feedLogs = feedRows.filter((r) => r.logType.startsWith("feed_"));
  const lastFeedRow = feedLogs[0] ?? null;
  const lastFeed = lastFeedRow
    ? new Date(lastFeedRow.loggedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const intervalMin = suggestedFeedIntervalMin(ageMonths);
  const nextFeed = lastFeedRow
    ? new Date(
        lastFeedRow.loggedAt.getTime() + intervalMin * 60_000,
      ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  const todayNaps = napRows.filter((r) => r.startedAt >= dayStart);
  const totalSleepMin = todayNaps.reduce(
    (sum, r) => sum + (r.durationMs ?? 0) / 60_000,
    0,
  );
  const sleepScore = formatSleepScoreLabel(
    computeSleepScoreLabel(todayNaps.length, totalSleepMin, ageMonths),
  );

  const logMap: Record<string, "done" | "missed"> = {};
  for (const v of vaxRows) logMap[v.ageLabel] = v.status as "done" | "missed";
  const upcoming = getUpcomingVaccinationsWithLog(ageMonths, logMap);
  const vaccineStatus =
    upcoming.length > 0
      ? `${upcoming[0]!.ageLabel} due`
      : "None due";

  const achieved = milestoneRows.filter((m) => m.state === "achieved").length;
  const total = Math.max(milestoneRows.length, 1);
  const milestoneProgressPct = Math.round((achieved / total) * 100);

  const dateKey = now.toISOString().slice(0, 10);
  const activity = pickDailyActivity(ageMonths, `${childId}-${dateKey}`);

  return {
    childId,
    childName,
    ageMonths,
    nextNap,
    nextFeed,
    lastSleep,
    lastFeed,
    activity: activity
      ? { emoji: activity.emoji, title: activity.title }
      : null,
    vaccineStatus,
    sleepScore,
    milestoneProgressPct,
    cryInsightHint:
      feedLogs.length === 0
        ? "Log a feed to improve Cry Insight accuracy."
        : null,
  };
}
