/**
 * Cry Insight (Beta) — REST routes.
 *
 *   POST /api/cry-insight/analyze       — score a cry sample + persist a row
 *   GET  /api/cry-insight/history/:id   — last N sessions for a child
 *
 * Mounted behind requireAuth in routes/index.ts.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  childrenTable,
  crySessionsTable,
  type CrySessionRow,
} from "@workspace/db";
import {
  analyseCry,
  CRY_CAUSES,
  type CryCause,
} from "../lib/cryInsight";

const router: IRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const audioStatsSchema = z
  .object({
    avgAmplitude: z.number().min(0).max(1).optional(),
    peakAmplitude: z.number().min(0).max(1).optional(),
    zeroCrossingRate: z.number().min(0).max(1).optional(),
    durationMs: z.number().int().min(0).max(60_000).optional(),
  })
  .strict();

const contextSchema = z
  .object({
    minutesSinceFeed: z.number().int().min(0).max(48 * 60).optional(),
    minutesSinceSleep: z.number().int().min(0).max(48 * 60).optional(),
    diaperChangedRecently: z.boolean().optional(),
    fever: z.boolean().optional(),
    ageMonths: z.number().int().min(0).max(240).optional(),
  })
  .strict();

const analyzeBodySchema = z.object({
  childId: z.number().int().positive(),
  durationMs: z.number().int().min(0).max(60_000).default(0),
  audioStats: audioStatsSchema.default({}),
  context: contextSchema.default({}),
});

const historyParamsSchema = z.object({
  childId: z.coerce.number().int().positive(),
});
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
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

/** Shape returned to clients (web + mobile share this). */
function toClientSession(row: CrySessionRow) {
  return {
    id: row.id,
    childId: row.childId,
    durationMs: row.durationMs,
    audioStats: row.audioStats,
    context: row.context,
    primary: {
      cause: row.primaryCause as CryCause,
      confidence: row.primaryConfidence,
    },
    secondary: {
      cause: row.secondaryCause as CryCause,
      confidence: row.secondaryConfidence,
    },
    suggestion: row.suggestion,
    medicalFlag: row.medicalFlag === 1,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/cry-insight/analyze", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = analyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  const child = await loadOwnedChild(body.childId, auth.userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  // Always derive ageMonths from the child record on the server — never
  // trust whatever the client sent. This blocks age-spoofing attempts that
  // would otherwise skew the classifier.
  const ctx = {
    ...body.context,
    ageMonths: child.ageMonths ?? undefined,
  };

  // Defensive: scrub any NaN/Infinity that may have slipped past Zod
  // (Zod's z.number() accepts NaN; jsonb does not store NaN safely).
  const safeStats: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.audioStats)) {
    if (typeof v === "number" && Number.isFinite(v)) safeStats[k] = v;
  }

  const result = analyseCry(safeStats, ctx);

  // Defensive: every cause we surface must be a known one (the engine
  // guarantees this, but we still gate before writing it to a text column).
  if (
    !CRY_CAUSES.includes(result.primary.cause) ||
    !CRY_CAUSES.includes(result.secondary.cause)
  ) {
    req.log.error(
      { result },
      "cry-insight engine returned unknown cause — rejecting",
    );
    res.status(500).json({ error: "engine_error" });
    return;
  }

  const [inserted] = await db
    .insert(crySessionsTable)
    .values({
      childId: body.childId,
      userId: auth.userId,
      durationMs: body.durationMs,
      audioStats: safeStats,
      context: ctx as Record<string, unknown>,
      primaryCause: result.primary.cause,
      primaryConfidence: result.primary.confidence,
      secondaryCause: result.secondary.cause,
      secondaryConfidence: result.secondary.confidence,
      suggestion: result.suggestion,
      medicalFlag: result.medicalFlag ? 1 : 0,
    })
    .returning();

  if (!inserted) {
    res.status(500).json({ error: "insert_failed" });
    return;
  }

  res.json({
    ok: true,
    session: toClientSession(inserted),
    breakdown: result.breakdown,
  });
});

router.get("/cry-insight/history/:childId", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const params = historyParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  const query = historyQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }

  const child = await loadOwnedChild(params.data.childId, auth.userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const rows = await db
    .select()
    .from(crySessionsTable)
    .where(
      and(
        eq(crySessionsTable.childId, params.data.childId),
        eq(crySessionsTable.userId, auth.userId),
      ),
    )
    .orderBy(desc(crySessionsTable.createdAt))
    .limit(query.data.limit);

  res.json({
    ok: true,
    sessions: rows.map(toClientSession),
  });
});

export default router;
