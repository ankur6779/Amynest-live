/**
 * Infant care logs — feeding, diaper, burp (cloud sync).
 *
 *   POST /api/infant-care/log
 *   GET  /api/infant-care/:childId
 *   GET  /api/infant-care/:childId/summary
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import {
  db,
  infantCareLogsTable,
  INFANT_CARE_LOG_TYPES,
  type InfantCareLogRow,
} from "@workspace/db";

const router: IRouter = Router();

const logBodySchema = z.object({
  childId: z.number().int().positive(),
  logType: z.enum(INFANT_CARE_LOG_TYPES),
  loggedAt: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), { message: "invalid_date" }),
});

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

function toClientRow(row: InfantCareLogRow) {
  return {
    id: row.id,
    childId: row.childId,
    logType: row.logType,
    loggedAt: row.loggedAt.toISOString(),
    actorUserId: row.userId,
  };
}

router.post("/infant-care/log", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = logBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const loggedAt = parsed.data.loggedAt
    ? new Date(parsed.data.loggedAt)
    : new Date();

  const [row] = await db
    .insert(infantCareLogsTable)
    .values({
      childId: parsed.data.childId,
      userId,
      logType: parsed.data.logType,
      loggedAt,
    })
    .returning();

  res.json({ ok: true, log: toClientRow(row!) });
});

router.get("/infant-care/:childId", async (req, res): Promise<void> => {
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

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const rows = await db
    .select()
    .from(infantCareLogsTable)
    .where(
      and(
        eq(infantCareLogsTable.childId, parsed.data.childId),
        gte(infantCareLogsTable.loggedAt, since),
      ),
    )
    .orderBy(desc(infantCareLogsTable.loggedAt))
    .limit(50);

  res.json({ ok: true, logs: rows.map(toClientRow) });
});

router.get("/infant-care/:childId/summary", async (req, res): Promise<void> => {
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

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const since = new Date(Date.now() - 48 * 60 * 60_000);
  const rows = await db
    .select()
    .from(infantCareLogsTable)
    .where(
      and(
        eq(infantCareLogsTable.childId, parsed.data.childId),
        gte(infantCareLogsTable.loggedAt, since),
      ),
    )
    .orderBy(desc(infantCareLogsTable.loggedAt))
    .limit(30);

  const lastFeed = rows.find((r) => r.logType.startsWith("feed_")) ?? null;
  const lastDiaper =
    rows.find((r) => r.logType.startsWith("diaper_")) ?? null;

  res.json({
    ok: true,
    lastFeed: lastFeed ? toClientRow(lastFeed) : null,
    lastDiaper: lastDiaper ? toClientRow(lastDiaper) : null,
    recentCount: rows.length,
  });
});

export default router;
