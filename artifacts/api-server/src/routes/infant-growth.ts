/**
 * Infant growth measurements + WHO-style reassurance bands.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import {
  db,
  infantGrowthMeasurementsTable,
  type InfantGrowthMeasurementRow,
} from "@workspace/db";
import {
  estimatePercentileBand,
  growthReassurance,
  type GrowthMetric,
} from "@workspace/infant-hub";

const router: IRouter = Router();

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const postBodySchema = z.object({
  childId: z.number().int().positive(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  headCm: z.number().positive().optional(),
  measuredAt: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid_date" })
    .optional(),
  notes: z.string().max(500).optional(),
});

function toClient(row: InfantGrowthMeasurementRow, ageMonths: number) {
  const bands: Partial<Record<GrowthMetric, string>> = {};
  if (row.weightKg != null) {
    const b = estimatePercentileBand("weight", row.weightKg, ageMonths);
    bands.weight = growthReassurance("weight", b);
  }
  if (row.heightCm != null) {
    const b = estimatePercentileBand("height", row.heightCm, ageMonths);
    bands.height = growthReassurance("height", b);
  }
  if (row.headCm != null) {
    const b = estimatePercentileBand("head", row.headCm, ageMonths);
    bands.head = growthReassurance("head", b);
  }
  return {
    id: row.id,
    weightKg: row.weightKg,
    heightCm: row.heightCm,
    headCm: row.headCm,
    measuredAt: row.measuredAt.toISOString(),
    notes: row.notes,
    reassurance: bands,
  };
}

router.get("/infant-growth/:childId", async (req, res): Promise<void> => {
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

  const rows = await db
    .select()
    .from(infantGrowthMeasurementsTable)
    .where(eq(infantGrowthMeasurementsTable.childId, parsed.data.childId))
    .orderBy(desc(infantGrowthMeasurementsTable.measuredAt))
    .limit(24);

  res.json({
    ok: true,
    measurements: rows.map((r) => toClient(r, child.ageMonths)),
  });
});

router.post("/infant-growth/log", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = postBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  if (
    parsed.data.weightKg == null &&
    parsed.data.heightCm == null &&
    parsed.data.headCm == null
  ) {
    res.status(400).json({ error: "at_least_one_metric" });
    return;
  }

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const [row] = await db
    .insert(infantGrowthMeasurementsTable)
    .values({
      childId: parsed.data.childId,
      userId,
      weightKg: parsed.data.weightKg ?? null,
      heightCm: parsed.data.heightCm ?? null,
      headCm: parsed.data.headCm ?? null,
      measuredAt: parsed.data.measuredAt
        ? new Date(parsed.data.measuredAt)
        : new Date(),
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.json({ ok: true, measurement: toClient(row!, child.ageMonths) });
});

export default router;
