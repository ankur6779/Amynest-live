import { eq } from "drizzle-orm";
import { db, coachJourneyTable, type CoachJourney } from "@workspace/db";
import {
  COACH_JOURNEY_FREE_DAYS,
  canGenerateCoachPlan,
  completedGoalIdsFromPlans,
  computeCoachJourneyAccess,
  getCoachGoalAccess,
  isCoachExtendUnlocked,
  maxNewGoalsForJourneyDay,
  migrateLegacyCoachUsage,
  normaliseCoachCompletedDays,
  normaliseCoachPlans,
  type CoachGoalAccess,
  type CoachJourneyAccess,
  type CoachPlanRecord,
} from "@workspace/coach-journey";
import { getOrCreateSubscription, isPremiumNow } from "./subscriptionService.js";
import { logger } from "../lib/logger.js";

export {
  COACH_JOURNEY_FREE_DAYS,
  FREE_COACH_GOAL_IDS,
  canGenerateCoachPlan,
  getCoachGoalAccess,
  isCoachExtendUnlocked,
} from "@workspace/coach-journey";

export interface CoachJourneyStatusResponse {
  access: CoachJourneyAccess;
  journeyDay: number;
  completedGoalIds: string[];
  plansCompleted: CoachPlanRecord[];
  maxNewGoalsToday: number;
  extendUnlocked: boolean;
}

export async function ensureCoachJourney(userId: string): Promise<CoachJourney> {
  const [existing] = await db
    .select()
    .from(coachJourneyTable)
    .where(eq(coachJourneyTable.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(coachJourneyTable)
    .values({ userId })
    .returning();

  logger.info({ evt: "coach_journey.started", userId }, "Amy Coach journey started");
  return created!;
}

function buildStatus(
  row: CoachJourney,
  premium: boolean,
): CoachJourneyStatusResponse {
  const completedDays = normaliseCoachCompletedDays(row.completedDays);
  const plansCompleted = normaliseCoachPlans(row.plansCompleted);
  const access = computeCoachJourneyAccess({
    isPremium: premium,
    completedDays,
    startedAt: row.startedAt,
  });
  const journeyDay = premium
    ? Math.min(completedDays.length + 1, COACH_JOURNEY_FREE_DAYS)
    : access.currentDay;
  const completedGoalIds = completedGoalIdsFromPlans(plansCompleted);

  return {
    access,
    journeyDay,
    completedGoalIds,
    plansCompleted,
    maxNewGoalsToday: maxNewGoalsForJourneyDay(journeyDay),
    extendUnlocked: isCoachExtendUnlocked({
      isPremium: premium,
      access,
      completedDays,
    }),
  };
}

export async function getCoachJourneyStatus(
  userId: string,
): Promise<CoachJourneyStatusResponse> {
  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const row = await ensureCoachJourney(userId);
  return buildStatus(row, premium);
}

export async function syncLegacyCoachUsage(
  userId: string,
  blockUsedIds: string[],
): Promise<CoachJourneyStatusResponse> {
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) {
    return getCoachJourneyStatus(userId);
  }

  const row = await ensureCoachJourney(userId);
  const existingPlans = normaliseCoachPlans(row.plansCompleted);
  if (existingPlans.length > 0) {
    return buildStatus(row, false);
  }

  const migrated = migrateLegacyCoachUsage(blockUsedIds);
  if (migrated.plansCompleted.length === 0) {
    return buildStatus(row, false);
  }

  const journeyFinished =
    migrated.completedDays.length >= COACH_JOURNEY_FREE_DAYS;
  const now = new Date();

  await db
    .update(coachJourneyTable)
    .set({
      completedDays: migrated.completedDays,
      currentDay: journeyFinished
        ? COACH_JOURNEY_FREE_DAYS + 1
        : migrated.completedDays.length + 1,
      plansCompleted: migrated.plansCompleted,
      completedAt: journeyFinished ? now : null,
      updatedAt: now,
    })
    .where(eq(coachJourneyTable.userId, userId));

  logger.info(
    { evt: "coach_journey.legacy_sync", userId, topics: migrated.plansCompleted.length },
    "Migrated legacy Amy Coach section usage",
  );

  const [updated] = await db
    .select()
    .from(coachJourneyTable)
    .where(eq(coachJourneyTable.userId, userId))
    .limit(1);
  return buildStatus(updated ?? row, false);
}

export async function assertCoachCanGenerate(
  userId: string,
  goalId: string,
): Promise<
  | { ok: true; status: CoachJourneyStatusResponse }
  | { ok: false; status: CoachJourneyStatusResponse; goalAccess: CoachGoalAccess }
> {
  const status = await getCoachJourneyStatus(userId);
  const goalAccess = getCoachGoalAccess({
    goalId,
    isPremium: status.access.isPremium,
    access: status.access,
    completedGoalIds: status.completedGoalIds,
  });
  if (!canGenerateCoachPlan({
    goalId,
    isPremium: status.access.isPremium,
    access: status.access,
    completedGoalIds: status.completedGoalIds,
  })) {
    return { ok: false, status, goalAccess };
  }
  return { ok: true, status };
}

export async function recordCoachPlanCompleted(
  userId: string,
  goalId: string,
  sessionId: string,
): Promise<CoachJourneyStatusResponse> {
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) {
    return getCoachJourneyStatus(userId);
  }

  const row = await ensureCoachJourney(userId);
  const completedDays = normaliseCoachCompletedDays(row.completedDays);
  const plansCompleted = normaliseCoachPlans(row.plansCompleted);
  const access = computeCoachJourneyAccess({
    isPremium: false,
    completedDays,
    startedAt: row.startedAt,
  });

  if (access.isLocked) {
    return buildStatus(row, false);
  }

  const completedGoalIds = completedGoalIdsFromPlans(plansCompleted);
  if (completedGoalIds.includes(goalId)) {
    return buildStatus(row, false);
  }

  const alreadyRecorded = plansCompleted.some((p) => p.sessionId === sessionId);
  if (alreadyRecorded) {
    return buildStatus(row, false);
  }

  const journeyDay = access.currentDay;
  const now = new Date();
  const nextPlan: CoachPlanRecord = {
    goalId,
    sessionId,
    journeyDay,
    completedAt: now.toISOString(),
  };
  const nextPlans = [...plansCompleted, nextPlan];

  let nextCompletedDays = completedDays;
  if (!completedDays.includes(journeyDay)) {
    nextCompletedDays = [...completedDays, journeyDay].sort((a, b) => a - b);
  }

  const journeyFinished =
    nextCompletedDays.length >= COACH_JOURNEY_FREE_DAYS;

  await db
    .update(coachJourneyTable)
    .set({
      completedDays: nextCompletedDays,
      currentDay: journeyFinished ? COACH_JOURNEY_FREE_DAYS + 1 : journeyDay + 1,
      plansCompleted: nextPlans,
      dayCompletedAt: {
        ...(typeof row.dayCompletedAt === "object" && row.dayCompletedAt
          ? row.dayCompletedAt
          : {}),
        [String(journeyDay)]: now.toISOString(),
      },
      completedAt: journeyFinished ? now : null,
      updatedAt: now,
    })
    .where(eq(coachJourneyTable.userId, userId));

  logger.info(
    {
      evt: journeyFinished ? "coach_journey.finished" : "coach_journey.plan_complete",
      userId,
      day: journeyDay,
      goalId,
    },
    journeyFinished ? "Amy Coach free journey finished" : "Amy Coach plan recorded",
  );

  const [updated] = await db
    .select()
    .from(coachJourneyTable)
    .where(eq(coachJourneyTable.userId, userId))
    .limit(1);
  return buildStatus(updated ?? row, false);
}

export async function assertCoachCanExtend(
  userId: string,
): Promise<{ ok: boolean; status: CoachJourneyStatusResponse }> {
  const status = await getCoachJourneyStatus(userId);
  if (status.access.isPremium || status.extendUnlocked) {
    return { ok: true, status };
  }
  return { ok: false, status };
}
