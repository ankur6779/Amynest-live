import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  routineFeedbackTable,
  routinesTable,
  childrenTable,
  ROUTINE_FEEDBACK_SIGNALS,
} from "@workspace/db";
import { CreateRoutineFeedbackBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ALLOWED_SIGNALS = new Set<string>(ROUTINE_FEEDBACK_SIGNALS);

/**
 * POST /api/routine-feedback
 * Parent feedback loop (Priority 1). Write-only collection layer that lives
 * ABOVE the frozen routine generation engine. Does not influence generation.
 */
router.post("/routine-feedback", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateRoutineFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { childId, routineId, routineDate, signal } = parsed.data;
  const activityKey = parsed.data.activityKey ?? null;

  if (!ALLOWED_SIGNALS.has(signal)) {
    res.status(400).json({ error: "invalid_signal" });
    return;
  }

  // Ownership: the routine must belong to a child owned by this user, and the
  // body's childId must match the routine's child (prevents IDOR / mismatch).
  const [owned] = await db
    .select({ routineChildId: routinesTable.childId })
    .from(routinesTable)
    .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
    .where(and(eq(routinesTable.id, routineId), eq(childrenTable.userId, userId)));

  if (!owned || owned.routineChildId !== childId) {
    res.status(403).json({ error: "Routine not found or not yours" });
    return;
  }

  try {
    const [row] = await db
      .insert(routineFeedbackTable)
      .values({ childId, routineId, routineDate, activityKey, signal })
      .returning();

    res.status(201).json({
      id: row.id,
      childId: row.childId,
      routineId: row.routineId,
      routineDate: row.routineDate,
      activityKey: row.activityKey ?? null,
      signal: row.signal,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error(
      `routine-feedback POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
