/**
 * Infant Buddy milestone progress — cloud sync for Parent Hub.
 *
 *   GET  /api/infant-milestones/:childId
 *   PUT  /api/infant-milestones/:childId/:milestoneId
 *   POST /api/infant-milestones/:childId/sync
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  childrenTable,
  infantMilestoneProgressTable,
  type InfantMilestoneProgressRow,
} from "@workspace/db";
import { MILESTONES } from "@workspace/infant-hub";

const router: IRouter = Router();

const VALID_MILESTONE_IDS = new Set(MILESTONES.map((m) => m.id));

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const milestoneParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
  milestoneId: z.string().min(1).max(64),
});

const stateSchema = z.enum(["not_started", "in_progress", "achieved"]);

const putBodySchema = z.object({
  state: stateSchema,
});

const syncBodySchema = z.object({
  progress: z.record(
    z.string(),
    z.object({
      state: stateSchema,
      updatedAt: z.number().int().nonnegative(),
    }),
  ),
});

async function ensureOwnedChild(
  childId: number,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

function toClientRow(row: InfantMilestoneProgressRow) {
  return {
    milestoneId: row.milestoneId,
    state: row.state as z.infer<typeof stateSchema>,
    updatedAt: row.updatedAt.getTime(),
  };
}

router.get("/infant-milestones/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = childIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_params" });
    return;
  }

  const { childId } = parsed.data;
  if (!(await ensureOwnedChild(childId, userId))) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const rows = await db
    .select()
    .from(infantMilestoneProgressTable)
    .where(
      and(
        eq(infantMilestoneProgressTable.childId, childId),
        eq(infantMilestoneProgressTable.userId, userId),
      ),
    );

  const progress: Record<
    string,
    { state: z.infer<typeof stateSchema>; updatedAt: number }
  > = {};
  for (const row of rows) {
    progress[row.milestoneId] = {
      state: row.state as z.infer<typeof stateSchema>,
      updatedAt: row.updatedAt.getTime(),
    };
  }

  res.json({ ok: true, childId, progress });
});

router.put(
  "/infant-milestones/:childId/:milestoneId",
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsedParams = milestoneParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: "invalid_params" });
      return;
    }

    const parsedBody = putBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const { childId, milestoneId } = parsedParams.data;
    if (!VALID_MILESTONE_IDS.has(milestoneId)) {
      res.status(404).json({ error: "milestone_not_found" });
      return;
    }

    if (!(await ensureOwnedChild(childId, userId))) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const [row] = await db
      .insert(infantMilestoneProgressTable)
      .values({
        userId,
        childId,
        milestoneId,
        state: parsedBody.data.state,
      })
      .onConflictDoUpdate({
        target: [
          infantMilestoneProgressTable.childId,
          infantMilestoneProgressTable.milestoneId,
        ],
        set: { state: parsedBody.data.state, updatedAt: new Date() },
      })
      .returning();

    if (!row) {
      res.status(500).json({ error: "could_not_save" });
      return;
    }

    res.json({ ok: true, ...toClientRow(row) });
  },
);

router.post(
  "/infant-milestones/:childId/sync",
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsedParams = childIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: "invalid_params" });
      return;
    }

    const parsedBody = syncBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const { childId } = parsedParams.data;
    if (!(await ensureOwnedChild(childId, userId))) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const existing = await db
      .select()
      .from(infantMilestoneProgressTable)
      .where(
        and(
          eq(infantMilestoneProgressTable.childId, childId),
          eq(infantMilestoneProgressTable.userId, userId),
        ),
      );

    const serverMap = new Map(
      existing.map((r) => [r.milestoneId, r.updatedAt.getTime()] as const),
    );

    let upserted = 0;
    for (const [milestoneId, entry] of Object.entries(
      parsedBody.data.progress,
    )) {
      if (!VALID_MILESTONE_IDS.has(milestoneId)) continue;
      const serverTs = serverMap.get(milestoneId) ?? 0;
      if (entry.updatedAt <= serverTs) continue;

      await db
        .insert(infantMilestoneProgressTable)
        .values({
          userId,
          childId,
          milestoneId,
          state: entry.state,
          updatedAt: new Date(entry.updatedAt),
        })
        .onConflictDoUpdate({
          target: [
            infantMilestoneProgressTable.childId,
            infantMilestoneProgressTable.milestoneId,
          ],
          set: { state: entry.state, updatedAt: new Date(entry.updatedAt) },
        });
      upserted += 1;
    }

    const rows = await db
      .select()
      .from(infantMilestoneProgressTable)
      .where(
        and(
          eq(infantMilestoneProgressTable.childId, childId),
          eq(infantMilestoneProgressTable.userId, userId),
        ),
      );

    const progress: Record<
      string,
      { state: z.infer<typeof stateSchema>; updatedAt: number }
    > = {};
    for (const row of rows) {
      progress[row.milestoneId] = {
        state: row.state as z.infer<typeof stateSchema>,
        updatedAt: row.updatedAt.getTime(),
      };
    }

    res.json({ ok: true, childId, upserted, progress });
  },
);

export default router;
