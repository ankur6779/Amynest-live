import { db, featureUsageTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Allow-list of Parent Hub feature IDs whose first-use is tracked server-side.
 * Adding a new feature requires bumping this set.
 */
export const PARENT_HUB_FEATURES = [
  "hub_articles",
  "hub_tips",
  "hub_emotional",
  "hub_activities",
  "hub_ptm_prep",
  "hub_smart_study",
  "hub_morning_flow",
  "hub_olympiad",
  "hub_life_skills",
  "hub_event_prep",
  "hub_ai_meal_generator",
  "hub_meals_tile",
] as const;

export type ParentHubFeatureId = (typeof PARENT_HUB_FEATURES)[number];

const featureSet = new Set<string>(PARENT_HUB_FEATURES);

export function isTrackedFeature(id: string): id is ParentHubFeatureId {
  return featureSet.has(id);
}

export interface FeatureUsageStatus {
  featureId: string;
  hasUsedOnce: boolean;
  useCount: number;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
}

/**
 * Returns ALL tracked feature statuses for the user — including ones with no
 * record yet (hasUsedOnce: false), so the client can render the full grid
 * without waiting for individual round-trips.
 */
export async function getUserFeatureStatus(
  userId: string,
): Promise<FeatureUsageStatus[]> {
  const rows = await db
    .select()
    .from(featureUsageTable)
    .where(eq(featureUsageTable.userId, userId));

  const byFeature = new Map(rows.map((r) => [r.featureId, r]));

  return PARENT_HUB_FEATURES.map((featureId) => {
    const r = byFeature.get(featureId);
    return {
      featureId,
      hasUsedOnce: !!r?.hasUsedOnce,
      useCount: r?.useCount ?? 0,
      firstUsedAt: r?.firstUsedAt?.toISOString() ?? null,
      lastUsedAt: r?.lastUsedAt?.toISOString() ?? null,
    };
  });
}

/**
 * Record one usage of a feature. Atomic via PG upsert: the first call inserts
 * a row with hasUsedOnce=true / useCount=1; subsequent calls bump useCount +
 * lastUsedAt without changing hasUsedOnce or firstUsedAt. Concurrent calls
 * cannot violate the unique (userId, featureId) constraint. Emits a
 * structured analytics log line.
 */
export async function trackFeatureUsage(
  userId: string,
  featureId: string,
): Promise<{ firstTime: boolean; useCount: number }> {
  const inserted = await db
    .insert(featureUsageTable)
    .values({
      userId,
      featureId,
      hasUsedOnce: true,
      useCount: 1,
    })
    .onConflictDoUpdate({
      target: [featureUsageTable.userId, featureUsageTable.featureId],
      set: {
        useCount: sql`${featureUsageTable.useCount} + 1`,
        lastUsedAt: sql`now()`,
      },
    })
    .returning({
      useCount: featureUsageTable.useCount,
      firstUsedAt: featureUsageTable.firstUsedAt,
    });

  const row = inserted[0];
  const useCount = row?.useCount ?? 1;
  const firstTime = useCount === 1;

  logger.info(
    {
      evt: firstTime ? "feature_usage.first_use" : "feature_usage.repeat_use",
      userId,
      featureId,
      useCount,
    },
    firstTime ? "feature first use" : "feature repeat use",
  );

  return { firstTime, useCount };
}

/**
 * Mark all of a user's existing feature_usage rows as having converted to
 * premium. Called from subscriptionService when a user upgrades, to power
 * "lock → conversion" analytics. Idempotent.
 */
export async function markAllFeaturesConverted(userId: string): Promise<void> {
  await db
    .update(featureUsageTable)
    .set({ convertedToPremium: true, convertedAt: sql`now()` })
    .where(
      and(
        eq(featureUsageTable.userId, userId),
        eq(featureUsageTable.convertedToPremium, false),
      ),
    );
}
