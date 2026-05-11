import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { childrenTable, parentProfilesTable } from "@workspace/db/schema";
import { getEnvironmentalContext, mapAgeGroupToEnvAgeGroup } from "@workspace/environment";
import { getAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

type AgeGroup = "infant" | "toddler" | "preschool" | "early_school" | "pre_teen";

function classifyAgeGroup(ageYears: number, ageMonths: number): AgeGroup {
  const totalMonths = ageYears * 12 + ageMonths;
  if (totalMonths < 12) return "infant";
  if (ageYears < 3) return "toddler";
  if (ageYears < 5) return "preschool";
  if (ageYears < 10) return "early_school";
  return "pre_teen";
}

/**
 * GET /api/environment/context
 *
 * Returns a fully-scored EnvironmentalContext for the requesting user.
 * Query params (all optional):
 *   childId  – integer; which child's age band to use for risk scoring.
 *              Falls back to the user's first child, then "toddler_1_3".
 *   lat      – float; caller's GPS latitude (overrides country/region lookup).
 *   lng      – float; caller's GPS longitude.
 */
router.get("/environment/context", async (req, res): Promise<void> => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const childIdParam = req.query.childId ? Number(req.query.childId) : null;
    const latParam = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lngParam = req.query.lng ? parseFloat(req.query.lng as string) : null;

    const [parentProfile] = await db
      .select()
      .from(parentProfilesTable)
      .where(eq(parentProfilesTable.userId, userId));

    let ageGroup: AgeGroup = "toddler";
    let childName: string | undefined;

    if (childIdParam) {
      const [child] = await db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.id, childIdParam));
      if (child) {
        ageGroup = classifyAgeGroup(child.age, child.ageMonths ?? 0);
        childName = child.name;
      }
    } else {
      const children = await db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId));
      if (children.length > 0) {
        const first = children[0];
        ageGroup = classifyAgeGroup(first.age, first.ageMonths ?? 0);
        childName = first.name;
      }
    }

    const envAgeGroup = mapAgeGroupToEnvAgeGroup(ageGroup);
    const today = new Date().toISOString().slice(0, 10);

    const ctx = await getEnvironmentalContext({
      ageGroup: envAgeGroup,
      date: today,
      latitude: latParam ?? null,
      longitude: lngParam ?? null,
      country: null,
      region: parentProfile?.region ?? null,
    });

    if (!ctx) {
      res.status(503).json({ error: "Environmental data temporarily unavailable" });
      return;
    }

    res.json({ context: ctx, childName: childName ?? null, ageGroup });
  } catch (err) {
    logger.error({ err }, "environment/context failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
