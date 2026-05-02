import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  dailyPuzzleProgressTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";

const router: IRouter = Router();

// ─── Validators ──────────────────────────────────────────────────────────────
const difficultySchema = z.enum(["easy", "medium", "hard"]);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const puzzleIdSchema = z.string().min(1).max(40);

/** Verify the child belongs to the authed user. */
async function ownsChild(userId: string, childId: number): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

// ─── GET /api/daily-puzzle/progress?childId=&date= ───────────────────────────
//
// Returns today's saved puzzle state for the child, or `null` when there is
// no row yet. Empty state is the normal "fresh start" — clients should treat
// a 200 with `progress: null` as "no server state yet".
router.get("/daily-puzzle/progress", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    date: dateSchema,
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(dailyPuzzleProgressTable)
    .where(
      and(
        eq(dailyPuzzleProgressTable.childId, parsed.data.childId),
        eq(dailyPuzzleProgressTable.userId, userId),
        eq(dailyPuzzleProgressTable.date, parsed.data.date),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    res.json({ ok: true, progress: null });
    return;
  }
  res.json({
    ok: true,
    progress: {
      childId: row.childId,
      date: row.date,
      difficulty: row.difficulty,
      correctStreak: row.correctStreak,
      wrongStreak: row.wrongStreak,
      usedIds: row.usedIds,
      sessionPuzzleIds: row.sessionPuzzleIds,
      results: row.results,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
});

// ─── PUT /api/daily-puzzle/progress ──────────────────────────────────────────
//
// Upsert the full daily puzzle state for (childId, date). Mobile sends the
// entire snapshot on every meaningful change (submit / restart) — this keeps
// the contract dead simple and lets the server be a pure mirror of the
// client's adaptive logic, which already lives in `@workspace/age-content`.
const upsertSchema = z.object({
  childId: z.number().int().positive(),
  date: dateSchema,
  difficulty: difficultySchema,
  correctStreak: z.number().int().min(0).max(1000),
  wrongStreak: z.number().int().min(0).max(1000),
  usedIds: z.array(puzzleIdSchema).max(500),
  sessionPuzzleIds: z.array(puzzleIdSchema).max(20),
  results: z.array(z.union([z.boolean(), z.null()])).max(20),
});

router.put("/daily-puzzle/progress", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const {
    childId,
    date,
    difficulty,
    correctStreak,
    wrongStreak,
    usedIds,
    sessionPuzzleIds,
    results,
  } = parsed.data;

  // `results` length must match `sessionPuzzleIds` length so the resume
  // logic on the client can always trust `idx = results.indexOf(null)`.
  if (results.length !== sessionPuzzleIds.length) {
    res.status(400).json({ error: "results_length_mismatch" });
    return;
  }

  if (!(await ownsChild(userId, childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const updated = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: dailyPuzzleProgressTable.id })
      .from(dailyPuzzleProgressTable)
      .where(
        and(
          eq(dailyPuzzleProgressTable.childId, childId),
          eq(dailyPuzzleProgressTable.userId, userId),
          eq(dailyPuzzleProgressTable.date, date),
        ),
      )
      .limit(1);

    const values = {
      childId,
      userId,
      date,
      difficulty,
      correctStreak,
      wrongStreak,
      usedIds,
      sessionPuzzleIds,
      results,
    };

    if (existing.length === 0) {
      const [row] = await tx
        .insert(dailyPuzzleProgressTable)
        .values(values)
        .returning();
      return row;
    }
    const [row] = await tx
      .update(dailyPuzzleProgressTable)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(dailyPuzzleProgressTable.id, existing[0].id))
      .returning();
    return row;
  });

  res.json({
    ok: true,
    progress: {
      childId: updated.childId,
      date: updated.date,
      difficulty: updated.difficulty,
      correctStreak: updated.correctStreak,
      wrongStreak: updated.wrongStreak,
      usedIds: updated.usedIds,
      sessionPuzzleIds: updated.sessionPuzzleIds,
      results: updated.results,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

export default router;
