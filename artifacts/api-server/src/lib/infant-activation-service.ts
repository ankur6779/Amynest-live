/**
 * Infant first-time parent activation — empty-state detection.
 */
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  crySessionsTable,
  infantCareLogsTable,
  infantGrowthMeasurementsTable,
  napSessionsTable,
} from "@workspace/db";
import { canAccessChild } from "./child-access.js";
import {
  computeInfantActivationFlags,
  INFANT_ACTIVATION_TOTAL_STEPS,
  type InfantActivationStepId,
} from "./infant-activation-flags.js";

export type { InfantActivationStepId } from "./infant-activation-flags.js";
export { computeInfantActivationFlags } from "./infant-activation-flags.js";

export type InfantActivationStatus = {
  childId: number;
  childAgeDays: number;
  childAgeMonths: number;
  steps: Record<InfantActivationStepId, boolean>;
  completedCount: number;
  totalSteps: number;
  completionRate: number;
  /** True when onboarding checklist should replace empty dashboard. */
  showActivation: boolean;
  /** All four wow-moment steps done. */
  isFullyActivated: boolean;
  isEmptyState: boolean;
};

export async function getInfantActivationStatus(
  childId: number,
  userId: string,
): Promise<InfantActivationStatus | null> {
  const child = await canAccessChild(childId, userId);
  if (!child) return null;

  const ageMonths = child.ageMonths;
  if (ageMonths < 0 || ageMonths >= 24) return null;

  const [childRow] = await db
    .select({ createdAt: childrenTable.createdAt, age: childrenTable.age, ageMonths: childrenTable.ageMonths })
    .from(childrenTable)
    .where(eq(childrenTable.id, childId))
    .limit(1);

  if (!childRow) return null;

  const childAgeDays = Math.floor(
    (Date.now() - childRow.createdAt.getTime()) / (24 * 60 * 60_000),
  );

  const [feedRow, sleepRow, growthRow, cryRow] = await Promise.all([
    db
      .select({ id: infantCareLogsTable.id })
      .from(infantCareLogsTable)
      .where(
        and(
          eq(infantCareLogsTable.childId, childId),
          sql`${infantCareLogsTable.logType} LIKE 'feed_%'`,
        ),
      )
      .limit(1),
    db
      .select({ id: napSessionsTable.id })
      .from(napSessionsTable)
      .where(eq(napSessionsTable.childId, childId))
      .limit(1),
    db
      .select({ id: infantGrowthMeasurementsTable.id })
      .from(infantGrowthMeasurementsTable)
      .where(
        and(
          eq(infantGrowthMeasurementsTable.childId, childId),
          sql`${infantGrowthMeasurementsTable.weightKg} IS NOT NULL`,
        ),
      )
      .limit(1),
    db
      .select({ id: crySessionsTable.id })
      .from(crySessionsTable)
      .where(eq(crySessionsTable.childId, childId))
      .limit(1),
  ]);

  const steps: Record<InfantActivationStepId, boolean> = {
    feed: feedRow.length > 0,
    sleep: sleepRow.length > 0,
    weight: growthRow.length > 0,
    cry: cryRow.length > 0,
  };

  const flags = computeInfantActivationFlags(steps, childAgeDays);

  return {
    childId,
    childAgeDays,
    childAgeMonths: childRow.age * 12 + childRow.ageMonths,
    steps,
    completedCount: flags.completedCount,
    totalSteps: INFANT_ACTIVATION_TOTAL_STEPS,
    completionRate: flags.completionRate,
    showActivation: flags.showActivation,
    isFullyActivated: flags.isFullyActivated,
    isEmptyState: flags.isEmptyState,
  };
}
