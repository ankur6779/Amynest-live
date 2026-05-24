import { eq } from "drizzle-orm";
import { db, routineJourneyTable, type RoutineJourney } from "@workspace/db";
import {
  ROUTINE_JOURNEY_FREE_DAYS,
  ROUTINE_JOURNEY_FREE_GENERATIONS,
  canGenerateRoutine,
  computeRoutineJourneyAccess,
  migrateLegacyRoutineUsage,
  normaliseRoutineCompletedDays,
  normaliseRoutineGenerations,
  type RoutineGenerationRecord,
  type RoutineJourneyAccess,
} from "@workspace/routine-journey";
import {
  getFeatureUsage,
  getOrCreateSubscription,
  isPremiumNow,
} from "./subscriptionService.js";
import { logger } from "../lib/logger.js";

export {
  ROUTINE_JOURNEY_FREE_DAYS,
  ROUTINE_JOURNEY_FREE_GENERATIONS,
  canGenerateRoutine,
} from "@workspace/routine-journey";

export interface RoutineJourneyStatusResponse {
  access: RoutineJourneyAccess;
  journeyDay: number;
  generationsCompleted: RoutineGenerationRecord[];
  generationsRemaining: number;
}

export async function ensureRoutineJourney(userId: string): Promise<RoutineJourney> {
  const [existing] = await db
    .select()
    .from(routineJourneyTable)
    .where(eq(routineJourneyTable.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(routineJourneyTable)
    .values({ userId })
    .returning();

  logger.info({ evt: "routine_journey.started", userId }, "Routine journey started");
  return created!;
}

function buildStatus(
  row: RoutineJourney,
  premium: boolean,
): RoutineJourneyStatusResponse {
  const completedDays = normaliseRoutineCompletedDays(row.completedDays);
  const generationsCompleted = normaliseRoutineGenerations(row.generationsCompleted);
  const access = computeRoutineJourneyAccess({
    isPremium: premium,
    completedDays,
    startedAt: row.startedAt,
  });
  const journeyDay = premium
    ? Math.min(completedDays.length + 1, ROUTINE_JOURNEY_FREE_DAYS)
    : access.currentDay;

  return {
    access,
    journeyDay,
    generationsCompleted,
    generationsRemaining: premium
      ? ROUTINE_JOURNEY_FREE_GENERATIONS
      : Math.max(0, ROUTINE_JOURNEY_FREE_GENERATIONS - access.generationsUsed),
  };
}

export async function getRoutineJourneyStatus(
  userId: string,
): Promise<RoutineJourneyStatusResponse> {
  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const row = await ensureRoutineJourney(userId);
  const generations = normaliseRoutineGenerations(row.generationsCompleted);
  if (!premium && generations.length === 0) {
    const legacyCount = await getFeatureUsage(userId, "routine_generate");
    if (legacyCount > 0) {
      return syncLegacyRoutineUsage(userId);
    }
  }
  return buildStatus(row, premium);
}

/** Entitlements helper — maps journey state into feature usage counters. */
export async function getRoutineGenerateEntitlement(
  userId: string,
  premium: boolean,
): Promise<{ used: number; limit: number; locked: boolean }> {
  if (premium) {
    return {
      used: 0,
      limit: ROUTINE_JOURNEY_FREE_GENERATIONS,
      locked: false,
    };
  }
  const status = await getRoutineJourneyStatus(userId);
  const used = status.access.generationsUsed;
  return {
    used,
    limit: ROUTINE_JOURNEY_FREE_GENERATIONS,
    locked: status.access.isLocked || used >= ROUTINE_JOURNEY_FREE_GENERATIONS,
  };
}

export async function syncLegacyRoutineUsage(
  userId: string,
): Promise<RoutineJourneyStatusResponse> {
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) {
    return getRoutineJourneyStatus(userId);
  }

  const row = await ensureRoutineJourney(userId);
  const existingGenerations = normaliseRoutineGenerations(row.generationsCompleted);
  if (existingGenerations.length > 0) {
    return buildStatus(row, false);
  }

  const legacyCount = await getFeatureUsage(userId, "routine_generate");
  const migrated = migrateLegacyRoutineUsage(legacyCount);
  if (migrated.generationsCompleted.length === 0) {
    return buildStatus(row, false);
  }

  const journeyFinished =
    migrated.completedDays.length >= ROUTINE_JOURNEY_FREE_DAYS;
  const now = new Date();

  await db
    .update(routineJourneyTable)
    .set({
      completedDays: migrated.completedDays,
      currentDay: journeyFinished
        ? ROUTINE_JOURNEY_FREE_DAYS + 1
        : migrated.completedDays.length + 1,
      generationsCompleted: migrated.generationsCompleted,
      completedAt: journeyFinished ? now : null,
      updatedAt: now,
    })
    .where(eq(routineJourneyTable.userId, userId));

  logger.info(
    {
      evt: "routine_journey.legacy_sync",
      userId,
      generations: migrated.generationsCompleted.length,
    },
    "Migrated legacy routine generation usage",
  );

  const [updated] = await db
    .select()
    .from(routineJourneyTable)
    .where(eq(routineJourneyTable.userId, userId))
    .limit(1);
  return buildStatus(updated ?? row, false);
}

export async function assertRoutineCanGenerate(
  userId: string,
): Promise<
  | { ok: true; status: RoutineJourneyStatusResponse }
  | { ok: false; status: RoutineJourneyStatusResponse }
> {
  const status = await getRoutineJourneyStatus(userId);
  if (
    canGenerateRoutine({
      isPremium: status.access.isPremium,
      access: status.access,
    })
  ) {
    return { ok: true, status };
  }
  return { ok: false, status };
}

export async function recordRoutineGeneration(
  userId: string,
  childId: number,
  date: string,
): Promise<RoutineJourneyStatusResponse> {
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) {
    return getRoutineJourneyStatus(userId);
  }

  const row = await ensureRoutineJourney(userId);
  const completedDays = normaliseRoutineCompletedDays(row.completedDays);
  const generationsCompleted = normaliseRoutineGenerations(row.generationsCompleted);
  const access = computeRoutineJourneyAccess({
    isPremium: false,
    completedDays,
    startedAt: row.startedAt,
  });

  if (access.isLocked) {
    return buildStatus(row, false);
  }

  const alreadyRecorded = generationsCompleted.some(
    (g) => g.childId === childId && g.date === date,
  );
  if (alreadyRecorded) {
    return buildStatus(row, false);
  }

  const journeyDay = access.currentDay;
  const now = new Date();
  const nextGeneration: RoutineGenerationRecord = {
    childId,
    date,
    journeyDay,
    completedAt: now.toISOString(),
  };
  const nextGenerations = [...generationsCompleted, nextGeneration];

  let nextCompletedDays = completedDays;
  if (!completedDays.includes(journeyDay)) {
    nextCompletedDays = [...completedDays, journeyDay].sort((a, b) => a - b);
  }

  const journeyFinished =
    nextCompletedDays.length >= ROUTINE_JOURNEY_FREE_DAYS;

  await db
    .update(routineJourneyTable)
    .set({
      completedDays: nextCompletedDays,
      currentDay: journeyFinished ? ROUTINE_JOURNEY_FREE_DAYS + 1 : journeyDay + 1,
      generationsCompleted: nextGenerations,
      dayCompletedAt: {
        ...(typeof row.dayCompletedAt === "object" && row.dayCompletedAt
          ? row.dayCompletedAt
          : {}),
        [String(journeyDay)]: now.toISOString(),
      },
      completedAt: journeyFinished ? now : null,
      updatedAt: now,
    })
    .where(eq(routineJourneyTable.userId, userId));

  logger.info(
    {
      evt: journeyFinished ? "routine_journey.finished" : "routine_journey.generation_complete",
      userId,
      day: journeyDay,
      childId,
      date,
    },
    journeyFinished ? "Routine free journey finished" : "Routine generation recorded",
  );

  const [updated] = await db
    .select()
    .from(routineJourneyTable)
    .where(eq(routineJourneyTable.userId, userId))
    .limit(1);
  return buildStatus(updated ?? row, false);
}
