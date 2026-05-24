import { eq } from "drizzle-orm";
import {
  db,
  userActivationJourneyTable,
  childrenTable,
  type UserActivationJourney,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { earnPoints } from "./gamingRewardsService";

export const JOURNEY_TOTAL_DAYS = 7;

/** One task per day — completed sequentially. */
export type JourneyTaskId =
  | "routine_generate"
  | "routine_task_complete"
  | "hub_explore"
  | "behavior_log"
  | "child_activity"
  | "amy_coach"
  | "weekly_review";

export interface JourneyDayDef {
  day: number;
  taskId: JourneyTaskId;
  titleKey: string;
  descriptionKey: string;
  ctaPath: string;
  ctaKey: string;
  pointsReward: number;
}

export const JOURNEY_DAYS: readonly JourneyDayDef[] = [
  {
    day: 1,
    taskId: "routine_generate",
    titleKey: "journey.day1_title",
    descriptionKey: "journey.day1_desc",
    ctaPath: "/routines/generate",
    ctaKey: "journey.day1_cta",
    pointsReward: 10,
  },
  {
    day: 2,
    taskId: "routine_task_complete",
    titleKey: "journey.day2_title",
    descriptionKey: "journey.day2_desc",
    ctaPath: "/routines",
    ctaKey: "journey.day2_cta",
    pointsReward: 10,
  },
  {
    day: 3,
    taskId: "hub_explore",
    titleKey: "journey.day3_title",
    descriptionKey: "journey.day3_desc",
    ctaPath: "/parenting-hub",
    ctaKey: "journey.day3_cta",
    pointsReward: 15,
  },
  {
    day: 4,
    taskId: "behavior_log",
    titleKey: "journey.day4_title",
    descriptionKey: "journey.day4_desc",
    ctaPath: "/behavior",
    ctaKey: "journey.day4_cta",
    pointsReward: 10,
  },
  {
    day: 5,
    taskId: "child_activity",
    titleKey: "journey.day5_title",
    descriptionKey: "journey.day5_desc",
    ctaPath: "/games",
    ctaKey: "journey.day5_cta",
    pointsReward: 15,
  },
  {
    day: 6,
    taskId: "amy_coach",
    titleKey: "journey.day6_title",
    descriptionKey: "journey.day6_desc",
    ctaPath: "/amy-coach",
    ctaKey: "journey.day6_cta",
    pointsReward: 10,
  },
  {
    day: 7,
    taskId: "weekly_review",
    titleKey: "journey.day7_title",
    descriptionKey: "journey.day7_desc",
    ctaPath: "/insights",
    ctaKey: "journey.day7_cta",
    pointsReward: 25,
  },
] as const;

const TASK_BY_DAY = new Map(JOURNEY_DAYS.map((d) => [d.day, d]));

export interface JourneyTaskView {
  day: number;
  taskId: JourneyTaskId;
  titleKey: string;
  descriptionKey: string;
  ctaPath: string;
  ctaKey: string;
  completed: boolean;
}

export interface JourneyStatus {
  active: boolean;
  currentDay: number;
  totalDays: number;
  completedDays: number[];
  startedAt: string;
  completedAt: string | null;
  progressPct: number;
  todayTask: JourneyTaskView | null;
}

function normaliseCompletedDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((n): n is number => typeof n === "number" && n >= 1 && n <= 7);
}

function buildStatus(row: UserActivationJourney): JourneyStatus {
  const completedDays = normaliseCompletedDays(row.completedDays);
  const allDone = completedDays.length >= JOURNEY_TOTAL_DAYS || row.currentDay > JOURNEY_TOTAL_DAYS;
  const activeDay = allDone ? null : Math.min(row.currentDay, JOURNEY_TOTAL_DAYS);
  const def = activeDay != null ? TASK_BY_DAY.get(activeDay) : undefined;

  const todayTask: JourneyTaskView | null =
    def && activeDay != null
      ? {
          day: def.day,
          taskId: def.taskId,
          titleKey: def.titleKey,
          descriptionKey: def.descriptionKey,
          ctaPath: def.ctaPath,
          ctaKey: def.ctaKey,
          completed: completedDays.includes(def.day),
        }
      : null;

  return {
    active: !allDone,
    currentDay: allDone ? JOURNEY_TOTAL_DAYS : row.currentDay,
    totalDays: JOURNEY_TOTAL_DAYS,
    completedDays,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    progressPct: Math.round((completedDays.length / JOURNEY_TOTAL_DAYS) * 100),
    todayTask,
  };
}

async function userHasChild(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .limit(1);
  return !!row;
}

/** Create journey row for users with at least one child profile. Idempotent. */
export async function ensureJourney(userId: string): Promise<UserActivationJourney | null> {
  const [existing] = await db
    .select()
    .from(userActivationJourneyTable)
    .where(eq(userActivationJourneyTable.userId, userId))
    .limit(1);
  if (existing) return existing;

  if (!(await userHasChild(userId))) return null;

  const [created] = await db
    .insert(userActivationJourneyTable)
    .values({ userId })
    .returning();

  logger.info({ evt: "journey.started", userId }, "7-day journey started");
  return created;
}

export async function getJourneyStatus(userId: string): Promise<JourneyStatus | null> {
  const row = await ensureJourney(userId);
  if (!row) return null;
  return buildStatus(row);
}

export interface JourneyCompleteResult {
  completed: boolean;
  day?: number;
  journeyFinished?: boolean;
}

/**
 * Mark the current day's task complete when `taskId` matches.
 * Advances sequentially — only the active day can be completed.
 */
export async function tryCompleteJourneyTask(
  userId: string,
  taskId: JourneyTaskId,
): Promise<JourneyCompleteResult> {
  const row = await ensureJourney(userId);
  if (!row) return { completed: false };

  if (row.currentDay > JOURNEY_TOTAL_DAYS || row.completedAt) {
    return { completed: false };
  }

  const expectedDay = row.currentDay;
  const expectedTask = TASK_BY_DAY.get(expectedDay)?.taskId;
  if (expectedTask !== taskId) {
    return { completed: false };
  }

  const completedDays = normaliseCompletedDays(row.completedDays);
  if (completedDays.includes(expectedDay)) {
    return { completed: false };
  }

  const now = new Date();
  const nextCompleted = [...completedDays, expectedDay].sort((a, b) => a - b);
  const dayCompletedAt = {
    ...(typeof row.dayCompletedAt === "object" && row.dayCompletedAt
      ? row.dayCompletedAt
      : {}),
    [String(expectedDay)]: now.toISOString(),
  };
  const journeyFinished = nextCompleted.length >= JOURNEY_TOTAL_DAYS;
  const nextDay = journeyFinished ? JOURNEY_TOTAL_DAYS + 1 : expectedDay + 1;

  await db
    .update(userActivationJourneyTable)
    .set({
      completedDays: nextCompleted,
      dayCompletedAt,
      currentDay: nextDay,
      completedAt: journeyFinished ? now : null,
      updatedAt: now,
    })
    .where(eq(userActivationJourneyTable.userId, userId));

  const dayDef = TASK_BY_DAY.get(expectedDay);
  if (dayDef && dayDef.pointsReward > 0) {
    earnPoints(userId, {
      childName: "Journey",
      activity: `Day ${expectedDay} mission complete`,
      amount: dayDef.pointsReward,
      source: "bonus",
      idempotencyKey: `journey-day-${expectedDay}`,
    }).catch((err) => {
      logger.warn({ err, userId, day: expectedDay }, "journey points award failed");
    });
  }

  logger.info(
    {
      evt: journeyFinished ? "journey.finished" : "journey.day_complete",
      userId,
      day: expectedDay,
      taskId,
    },
    journeyFinished ? "7-day journey finished" : "journey day complete",
  );

  return { completed: true, day: expectedDay, journeyFinished };
}

/** Fire-and-forget helper for route handlers. */
export function fireJourneyTask(userId: string, taskId: JourneyTaskId): void {
  void tryCompleteJourneyTask(userId, taskId).catch((err) => {
    logger.warn({ err, userId, taskId }, "fireJourneyTask failed");
  });
}

/** For notification nudges — returns the active task id if journey is in progress. */
export async function getActiveJourneyTaskId(
  userId: string,
): Promise<JourneyTaskId | null> {
  const status = await getJourneyStatus(userId);
  if (!status?.active || !status.todayTask || status.todayTask.completed) {
    return null;
  }
  return status.todayTask.taskId;
}
