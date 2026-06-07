/**
 * Infant Feeding Plan API.
 *
 *   POST /api/infant-feeding/plan
 *   GET  /api/infant-feeding/plan/:childId
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { getAuth } from "../lib/auth.js";
import { requireAuth } from "../middlewares/requireAuth";
import { applyFeatureGate } from "../middlewares/featureGate.js";
import { canAccessChild } from "../lib/child-access.js";
import {
  db,
  aiCacheTable,
  infantCareLogsTable,
  parentProfilesTable,
} from "@workspace/db";
import { totalAgeMonths } from "../lib/infant-age.js";
import type { InfantFeedingPlan, InfantFeedingPlanContext } from "../lib/infant-feeding-prompts.js";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";
import { logger } from "../lib/logger.js";
import { persistInfantProductAnalyticsEvent } from "../services/infantAnalyticsIngestService.js";

const router: IRouter = Router();

export const INFANT_FEEDING_CACHE_NAMESPACE = "infant_feeding_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_FEEDING_AGE_MONTHS = 6;
const MAX_FEEDING_AGE_MONTHS = 24;

const postBodySchema = z
  .object({
    childId: z.number().int().positive(),
    forceRefresh: z.boolean().optional(),
  })
  .strict();

const childIdParamsSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

function cacheKeyFor(userId: string, childId: number): string {
  return `${INFANT_FEEDING_CACHE_NAMESPACE}:${userId}:${childId}`;
}

function isFeedingPlanAge(ageMonths: number): boolean {
  return ageMonths >= MIN_FEEDING_AGE_MONTHS && ageMonths < MAX_FEEDING_AGE_MONTHS;
}

async function loadFeedingContext(
  childId: number,
  userId: string,
): Promise<InfantFeedingPlanContext | null> {
  const child = await canAccessChild(childId, userId);
  if (!child) return null;

  const ageMonths = totalAgeMonths(child.age ?? 0, child.ageMonths ?? 0);
  if (!isFeedingPlanAge(ageMonths)) return null;

  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60_000);
  const [logs, parentRows] = await Promise.all([
    db
      .select()
      .from(infantCareLogsTable)
      .where(
        and(
          eq(infantCareLogsTable.childId, childId),
          gte(infantCareLogsTable.loggedAt, since14d),
        ),
      )
      .orderBy(desc(infantCareLogsTable.loggedAt))
      .limit(80),
    db
      .select({ allergies: parentProfilesTable.allergies })
      .from(parentProfilesTable)
      .where(eq(parentProfilesTable.userId, userId))
      .limit(1),
  ]);

  return {
    childName: String(child.name ?? "Baby").slice(0, 40),
    ageMonths,
    dietType: child.dietType ?? undefined,
    allergies: String(child.allergies ?? "").slice(0, 200),
    parentAllergies: String(parentRows[0]?.allergies ?? "").slice(0, 200),
    careLogs14d: logs.map((l) => ({
      logType: l.logType,
      loggedAt: l.loggedAt.toISOString(),
    })),
  };
}

async function getCachedPlan(
  userId: string,
  childId: number,
): Promise<{ plan: InfantFeedingPlan; generatedAt: string } | null> {
  try {
    const key = cacheKeyFor(userId, childId);
    const rows = await db
      .select()
      .from(aiCacheTable)
      .where(eq(aiCacheTable.cacheKey, key))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (Date.now() - new Date(row.createdAt).getTime() > CACHE_TTL_MS) return null;
    return {
      plan: row.response as InfantFeedingPlan,
      generatedAt: row.createdAt.toISOString(),
    };
  } catch (err) {
    logger.warn({ err }, "infant-feeding plan cache read failed");
    return null;
  }
}

/** Cache + analytics after sync or BullMQ poll completion. */
export async function persistInfantFeedingPlan(
  userId: string,
  childId: number,
  input: unknown,
  plan: InfantFeedingPlan,
  ageMonths?: number,
): Promise<void> {
  await setCachedPlan(userId, childId, input, plan);
  void persistInfantProductAnalyticsEvent({
    userId,
    childId,
    childAgeMonths: ageMonths,
    event: "infant_feeding_plan_generated",
    properties: {
      allergySteps: plan.allergyIntroductionRoadmap?.length ?? 0,
    },
  }).catch(() => undefined);
}

async function setCachedPlan(
  userId: string,
  childId: number,
  input: unknown,
  plan: InfantFeedingPlan,
): Promise<void> {
  try {
    const key = cacheKeyFor(userId, childId);
    await db
      .insert(aiCacheTable)
      .values({ cacheKey: key, namespace: INFANT_FEEDING_CACHE_NAMESPACE, input, response: plan })
      .onConflictDoUpdate({
        target: aiCacheTable.cacheKey,
        set: { input, response: plan, createdAt: new Date() },
      });
  } catch (err) {
    logger.warn({ err }, "infant-feeding plan cache write failed");
  }
}

router.get(
  "/infant-feeding/plan/:childId",
  requireAuth,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const params = childIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "invalid_params" });
      return;
    }

    const child = await canAccessChild(params.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    if (!isFeedingPlanAge(child.ageMonths)) {
      res.status(400).json({
        error: "age_out_of_range",
        message: "Feeding plan is for babies 6–24 months.",
      });
      return;
    }

    const cached = await getCachedPlan(userId, params.data.childId);
    if (!cached) {
      res.status(404).json({ error: "no_plan" });
      return;
    }

    res.set("Cache-Control", "private, max-age=3600");
    res.json({ ok: true, plan: cached.plan, generatedAt: cached.generatedAt, cached: true });
  },
);

router.post(
  "/infant-feeding/plan",
  requireAuth,
  async (req, res): Promise<void> => {
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

    const child = await canAccessChild(parsed.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const ageMonths = totalAgeMonths(child.age ?? 0, child.ageMonths ?? 0);
    if (!isFeedingPlanAge(ageMonths)) {
      res.status(400).json({
        error: "age_out_of_range",
        message: "Feeding plan is for babies 6–24 months.",
      });
      return;
    }

    const context = await loadFeedingContext(parsed.data.childId, userId);
    if (!context) {
      res.status(400).json({ error: "age_out_of_range" });
      return;
    }

    if (!parsed.data.forceRefresh) {
      const cached = await getCachedPlan(userId, parsed.data.childId);
      if (cached) {
        res.set("Cache-Control", "private, max-age=3600");
        res.set("X-Cache", "HIT");
        res.json({
          ok: true,
          plan: cached.plan,
          generatedAt: cached.generatedAt,
          cached: true,
        });
        return;
      }
    }

    let gateAllowed = false;
    await applyFeatureGate(req, res, "infant_feeding_plan", () => {
      gateAllowed = true;
    });
    if (!gateAllowed) return;

    await submitRouteAiJob({
      routeName: "infant-feeding/plan",
      type: "infant.feeding_plan",
      userId,
      input: { context, userId, childId: parsed.data.childId },
      pollContext: {
        userId,
        childId: parsed.data.childId,
        context,
        ageMonths,
      },
      waitMs: 0,
      buildSyncBody: (result) => {
        const plan = (result as { plan: InfantFeedingPlan }).plan;
        void persistInfantFeedingPlan(userId, parsed.data.childId, context, plan, ageMonths);
        res.set("Cache-Control", "private, max-age=3600");
        res.set("X-Cache", "MISS");
        return {
          ok: true,
          plan,
          generatedAt: new Date().toISOString(),
          cached: false,
        };
      },
      res,
    });
  },
);

export default router;
