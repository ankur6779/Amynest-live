import { eq, and } from "drizzle-orm";
import { db, userCoachSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import type { CoachInput, CoachPlan } from "./coachWinGenerationService.js";

/** Persist session for "Continue plan" restore. Non-fatal on failure. */
export async function saveCoachSession(
  userId: string,
  sessionId: string,
  goalId: string,
  plan: CoachPlan,
  inputs: CoachInput,
): Promise<void> {
  try {
    await db
      .insert(userCoachSessionsTable)
      .values({
        sessionId,
        userId,
        goalId,
        planJson: plan as unknown as Record<string, unknown>,
        inputs: inputs as unknown as Record<string, unknown>,
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, "ai-coach session save failed (non-fatal)");
  }
}

export async function updateCoachSessionPlanRow(
  userId: string,
  sessionId: string,
  plan: CoachPlan,
): Promise<void> {
  try {
    await db
      .update(userCoachSessionsTable)
      .set({ planJson: plan as unknown as Record<string, unknown> })
      .where(
        and(
          eq(userCoachSessionsTable.userId, userId),
          eq(userCoachSessionsTable.sessionId, sessionId),
        ),
      );
  } catch (err) {
    logger.warn({ err, sessionId }, "ai-coach session plan update failed (non-fatal)");
  }
}
