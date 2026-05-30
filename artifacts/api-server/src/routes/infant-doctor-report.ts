/**
 * Doctor visit summary — JSON payload for client PDF/print export.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import {
  db,
  napSessionsTable,
  infantCareLogsTable,
  infantGrowthMeasurementsTable,
  infantMilestoneProgressTable,
  vaccinationLogsTable,
  crySessionsTable,
} from "@workspace/db";
import {
  getVaccinationSummary,
  type VaxLogMap,
} from "@workspace/infant-hub";

const router: IRouter = Router();

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/infant-doctor-report/:childId", async (req, res): Promise<void> => {
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

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60_000);

  const [naps, feeds, growth, milestones, vaxRows, cries] = await Promise.all([
    db
      .select()
      .from(napSessionsTable)
      .where(
        and(
          eq(napSessionsTable.childId, child.id),
          gte(napSessionsTable.startedAt, since7d),
        ),
      )
      .orderBy(desc(napSessionsTable.startedAt))
      .limit(30),
    db
      .select()
      .from(infantCareLogsTable)
      .where(
        and(
          eq(infantCareLogsTable.childId, child.id),
          gte(infantCareLogsTable.loggedAt, since7d),
        ),
      )
      .orderBy(desc(infantCareLogsTable.loggedAt))
      .limit(40),
    db
      .select()
      .from(infantGrowthMeasurementsTable)
      .where(eq(infantGrowthMeasurementsTable.childId, child.id))
      .orderBy(desc(infantGrowthMeasurementsTable.measuredAt))
      .limit(6),
    db
      .select()
      .from(infantMilestoneProgressTable)
      .where(eq(infantMilestoneProgressTable.childId, child.id)),
    db
      .select()
      .from(vaccinationLogsTable)
      .where(eq(vaccinationLogsTable.childId, child.id)),
    db
      .select()
      .from(crySessionsTable)
      .where(
        and(
          eq(crySessionsTable.childId, child.id),
          gte(crySessionsTable.createdAt, since7d),
        ),
      )
      .orderBy(desc(crySessionsTable.createdAt))
      .limit(10),
  ]);

  const logMap: VaxLogMap = {};
  for (const v of vaxRows) logMap[v.ageLabel] = v.status as "done" | "missed";
  const vaxSummary = getVaccinationSummary(child.ageMonths, logMap);

  const achieved = milestones.filter((m) => m.state === "achieved");

  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    child: {
      id: child.id,
      name: child.name,
      ageMonths: child.ageMonths,
    },
    sleep: {
      sessionsLast7Days: naps.length,
      totalSleepHours: Math.round(
        naps.reduce((s, n) => s + n.durationMs, 0) / 3_600_000,
      ),
      recent: naps.slice(0, 5).map((n) => ({
        kind: n.kind,
        startedAt: n.startedAt.toISOString(),
        durationMin: Math.round(n.durationMs / 60_000),
      })),
    },
    feeding: {
      logsLast7Days: feeds.filter((f) => f.logType.startsWith("feed_")).length,
      diaperLogs: feeds.filter((f) => f.logType.startsWith("diaper_")).length,
      recent: feeds.slice(0, 8).map((f) => ({
        type: f.logType,
        at: f.loggedAt.toISOString(),
      })),
    },
    growth: growth.map((g) => ({
      measuredAt: g.measuredAt.toISOString(),
      weightKg: g.weightKg,
      heightCm: g.heightCm,
      headCm: g.headCm,
    })),
    vaccines: vaxSummary,
    milestones: {
      achieved: achieved.length,
      inProgress: milestones.filter((m) => m.state === "in_progress").length,
      recentAchieved: achieved.slice(0, 5).map((m) => m.milestoneId),
    },
    cryInsight: {
      sessionsLast7Days: cries.length,
      topCause: cries[0]?.primaryCause ?? null,
    },
    disclaimer:
      "Summary for discussion with your paediatrician — not a medical diagnosis.",
  });
});

export default router;
