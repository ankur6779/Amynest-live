/**
 * Per-child vaccination log — REST routes.
 *
 *   GET    /api/vaccinations/:childId               — list logs for a child
 *   PUT    /api/vaccinations/:childId/:ageLabel     — set status (upsert)
 *   DELETE /api/vaccinations/:childId/:ageLabel     — clear status
 *
 * Mounted behind requireAuth in routes/index.ts. The canonical schedule
 * lives in `@workspace/infant-hub` (`VACCINATIONS`); we only persist the
 * parent's per-child overrides keyed by `ageLabel`.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  childrenTable,
  vaccinationLogsTable,
  type VaccinationLogRow,
} from "@workspace/db";
import { VACCINATIONS, type VaxStatus } from "@workspace/infant-hub";

const router: IRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const ageLabelParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
  ageLabel: z.string().min(1).max(40),
});

const putBodySchema = z.object({
  status: z.enum(["done", "missed"]),
  /** Optional ISO date the dose was given (only used when status="done"). */
  doneAt: z.string().datetime().optional(),
});

// Pre-compute the set of valid schedule keys once so we can reject any
// ageLabel the client invents — keeps junk out of the table.
const VALID_AGE_LABELS = new Set(VACCINATIONS.map((v) => v.ageLabel));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function toClientLog(row: VaccinationLogRow) {
  return {
    childId: row.childId,
    ageLabel: row.ageLabel,
    status: row.status as VaxStatus,
    doneAt: row.doneAt ? row.doneAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/vaccinations/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const params = childIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }

  if (!(await ensureOwnedChild(params.data.childId, userId))) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const rows = await db
    .select()
    .from(vaccinationLogsTable)
    .where(
      and(
        eq(vaccinationLogsTable.childId, params.data.childId),
        eq(vaccinationLogsTable.userId, userId),
      ),
    );

  res.json({ ok: true, logs: rows.map(toClientLog) });
});

router.put(
  "/vaccinations/:childId/:ageLabel",
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const params = ageLabelParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "invalid_params" });
      return;
    }
    if (!VALID_AGE_LABELS.has(params.data.ageLabel)) {
      res.status(400).json({ error: "unknown_age_label" });
      return;
    }

    const body = putBodySchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(400)
        .json({ error: "invalid_body", details: body.error.flatten() });
      return;
    }

    if (!(await ensureOwnedChild(params.data.childId, userId))) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const doneAt =
      body.data.status === "done"
        ? body.data.doneAt
          ? new Date(body.data.doneAt)
          : new Date()
        : null;

    const [row] = await db
      .insert(vaccinationLogsTable)
      .values({
        userId,
        childId: params.data.childId,
        ageLabel: params.data.ageLabel,
        status: body.data.status,
        doneAt,
      })
      .onConflictDoUpdate({
        target: [vaccinationLogsTable.childId, vaccinationLogsTable.ageLabel],
        set: {
          status: body.data.status,
          doneAt,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    if (!row) {
      res.status(500).json({ error: "upsert_failed" });
      return;
    }

    res.json({ ok: true, log: toClientLog(row) });
  },
);

router.delete(
  "/vaccinations/:childId/:ageLabel",
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const params = ageLabelParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "invalid_params" });
      return;
    }

    if (!(await ensureOwnedChild(params.data.childId, userId))) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    await db
      .delete(vaccinationLogsTable)
      .where(
        and(
          eq(vaccinationLogsTable.childId, params.data.childId),
          eq(vaccinationLogsTable.userId, userId),
          eq(vaccinationLogsTable.ageLabel, params.data.ageLabel),
        ),
      );

    res.json({ ok: true });
  },
);

export default router;
