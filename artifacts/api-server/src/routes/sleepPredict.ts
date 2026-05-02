/**
 * Infant Sleep Prediction — REST routes.
 *
 *   POST /api/sleep-predict/log              — log a nap or night sleep
 *   GET  /api/sleep-predict/predict/:childId — next-sleep prediction
 *   GET  /api/sleep-predict/history/:childId — recent sessions
 *
 * Mounted behind requireAuth in routes/index.ts. Server always derives
 * `ageMonths` from the child record (never trusts the client).
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  childrenTable,
  napSessionsTable,
  type NapSessionRow,
} from "@workspace/db";
import {
  predictNextSleep,
  buildPredictInputFromHistory,
  type NapHistoryEntry,
} from "../lib/sleepPredict";

const router: IRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

/** Accept ISO strings; we coerce to Date inside the handler. */
const isoDateString = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid_date" });

const logBodySchema = z
  .object({
    childId: z.number().int().positive(),
    kind: z.enum(["nap", "night"]).default("nap"),
    startedAt: isoDateString,
    endedAt: isoDateString.optional(),
  })
  .strict()
  .refine(
    (b) => !b.endedAt || Date.parse(b.endedAt) > Date.parse(b.startedAt),
    { message: "endedAt_must_be_after_startedAt", path: ["endedAt"] },
  );

const childIdParamsSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// Browser's getTimezoneOffset() returns minutes west of UTC and lives in
// [-840..840]. We accept it as an optional query param on /predict so the
// "naps today" boundary aligns with the parent's wall clock.
const predictQuerySchema = z.object({
  tzOffsetMin: z.coerce.number().int().min(-840).max(840).default(0),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function toClientSession(row: NapSessionRow) {
  return {
    id: row.id,
    childId: row.childId,
    kind: row.kind as "nap" | "night",
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowsToHistoryEntries(rows: NapSessionRow[]): NapHistoryEntry[] {
  return rows.map((r) => ({
    kind: (r.kind === "night" ? "night" : "nap") as "nap" | "night",
    startedAt: r.startedAt.getTime(),
    endedAt: r.endedAt ? r.endedAt.getTime() : undefined,
  }));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/sleep-predict/log", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = logBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  const child = await loadOwnedChild(body.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const startedAt = new Date(body.startedAt);
  const endedAt = body.endedAt ? new Date(body.endedAt) : null;
  const durationMs = endedAt ? endedAt.getTime() - startedAt.getTime() : 0;

  // Idempotent finalize: if the client is closing out a session it already
  // started (same child + kind + startedAt with endedAt=null), UPDATE the
  // existing row instead of inserting a duplicate. This makes the
  // start → wake flow safe even on retries / network blips.
  if (endedAt) {
    const [open] = await db
      .select()
      .from(napSessionsTable)
      .where(
        and(
          eq(napSessionsTable.childId, body.childId),
          eq(napSessionsTable.userId, userId),
          eq(napSessionsTable.kind, body.kind),
          eq(napSessionsTable.startedAt, startedAt),
          isNull(napSessionsTable.endedAt),
        ),
      )
      .limit(1);
    if (open) {
      const [updated] = await db
        .update(napSessionsTable)
        .set({ endedAt, durationMs })
        .where(eq(napSessionsTable.id, open.id))
        .returning();
      if (!updated) {
        res.status(500).json({ error: "update_failed" });
        return;
      }
      res.json({ ok: true, session: toClientSession(updated) });
      return;
    }
  }

  const [inserted] = await db
    .insert(napSessionsTable)
    .values({
      childId: body.childId,
      userId,
      kind: body.kind,
      startedAt,
      endedAt,
      durationMs,
    })
    .returning();

  if (!inserted) {
    res.status(500).json({ error: "insert_failed" });
    return;
  }

  res.json({ ok: true, session: toClientSession(inserted) });
});

router.get(
  "/sleep-predict/predict/:childId",
  async (req, res): Promise<void> => {
    const auth = getAuth(req);
    const userId = auth.userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const params = childIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "invalid_child_id" });
      return;
    }
    const query = predictQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const child = await loadOwnedChild(params.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Pull a small recent slice for the engine (5 days × ~6 sessions/day).
    const rows = await db
      .select()
      .from(napSessionsTable)
      .where(
        and(
          eq(napSessionsTable.childId, params.data.childId),
          eq(napSessionsTable.userId, userId),
        ),
      )
      .orderBy(desc(napSessionsTable.startedAt))
      .limit(30);

    const ageMonths = child.ageMonths ?? 0;
    const input = buildPredictInputFromHistory(
      rowsToHistoryEntries(rows),
      ageMonths,
      Date.now(),
      query.data.tzOffsetMin,
    );
    const prediction = predictNextSleep(input);

    res.json({
      ok: true,
      ageMonths,
      prediction: {
        ...prediction,
        predictedAt: new Date(prediction.predictedAt).toISOString(),
        windowStart: new Date(prediction.windowStart).toISOString(),
        windowEnd: new Date(prediction.windowEnd).toISOString(),
      },
      lastSession: rows[0] ? toClientSession(rows[0]) : null,
      disclaimer:
        "This is a guidance system based on sleep patterns, not medical advice.",
    });
  },
);

router.get(
  "/sleep-predict/history/:childId",
  async (req, res): Promise<void> => {
    const auth = getAuth(req);
    const userId = auth.userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const params = childIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "invalid_child_id" });
      return;
    }
    const query = historyQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const child = await loadOwnedChild(params.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const rows = await db
      .select()
      .from(napSessionsTable)
      .where(
        and(
          eq(napSessionsTable.childId, params.data.childId),
          eq(napSessionsTable.userId, userId),
        ),
      )
      .orderBy(desc(napSessionsTable.startedAt))
      .limit(query.data.limit);

    res.json({ ok: true, sessions: rows.map(toClientSession) });
  },
);

export default router;
