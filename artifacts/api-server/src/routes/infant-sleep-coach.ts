/**
 * Infant Sleep Coach API.
 *
 *   POST /api/infant-sleep/coach-plan
 *   GET  /api/infant-sleep/coach-plan/:childId
 *   POST /api/infant-sleep/weekly-report (premium weekly summary)
 *   POST /api/infant-sleep/schedule-weekly-report (cron stub)
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
  napSessionsTable,
  type NapSessionRow,
} from "@workspace/db";
import {
  buildPredictInputFromHistory,
  predictNextSleep,
  type NapHistoryEntry,
} from "../lib/sleepPredict.js";
import {
  isInfantAgeMonths,
  totalAgeMonths,
} from "../lib/infant-age.js";
import type { InfantSleepCoachContext, InfantSleepCoachPlan } from "../lib/infant-sleep-prompts.js";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";
import { logger } from "../lib/logger.js";
import {
  getOrCreateSubscription,
  isPremiumNow,
} from "../services/subscriptionService.js";
import { generateWeeklySleepReport } from "../services/infantWeeklySleepReportService.js";
import { persistInfantProductAnalyticsEvent } from "../services/infantAnalyticsIngestService.js";

const router: IRouter = Router();

export const INFANT_SLEEP_CACHE_NAMESPACE = "infant_sleep_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const coachPlanBodySchema = z
  .object({
    childId: z.number().int().positive(),
    forceRefresh: z.boolean().optional(),
    tzOffsetMin: z.number().int().min(-840).max(840).optional(),
  })
  .strict();

const childIdParamsSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const reportBodySchema = z.object({
  childId: z.number().int().positive(),
});

function cacheKeyFor(userId: string, childId: number): string {
  return `${INFANT_SLEEP_CACHE_NAMESPACE}:${userId}:${childId}`;
}

function rowsToHistoryEntries(rows: NapSessionRow[]): NapHistoryEntry[] {
  return rows.map((r) => ({
    kind: (r.kind === "night" ? "night" : "nap") as "nap" | "night",
    startedAt: r.startedAt.getTime(),
    endedAt: r.endedAt ? r.endedAt.getTime() : undefined,
  }));
}

async function loadSleepContext(
  childId: number,
  userId: string,
  tzOffsetMin = 0,
): Promise<InfantSleepCoachContext | null> {
  const child = await canAccessChild(childId, userId);
  if (!child) return null;

  const ageMonths = totalAgeMonths(child.age ?? 0, child.ageMonths ?? 0);
  if (!isInfantAgeMonths(ageMonths)) return null;

  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60_000);
  const rows = await db
    .select()
    .from(napSessionsTable)
    .where(
      and(
        eq(napSessionsTable.childId, childId),
        gte(napSessionsTable.startedAt, since14d),
      ),
    )
    .orderBy(desc(napSessionsTable.startedAt))
    .limit(80);

  const napSessions14d = rows.map((r) => ({
    kind: (r.kind === "night" ? "night" : "nap") as "nap" | "night",
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    durationMin: r.durationMs != null ? Math.round(r.durationMs / 60_000) : null,
  }));

  let sleepPrediction: InfantSleepCoachContext["sleepPrediction"] = null;
  try {
    const input = buildPredictInputFromHistory(
      rowsToHistoryEntries(rows),
      child.ageMonths ?? ageMonths,
      Date.now(),
      tzOffsetMin,
    );
    const pred = predictNextSleep(input);
    sleepPrediction = {
      nextWindowStart: new Date(pred.windowStart).toISOString(),
      nextWindowEnd: new Date(pred.windowEnd).toISOString(),
      avgWakeWindowMin: pred.idealWakeWindowMin,
      napsToday: pred.suggestedNapsPerDay.max,
      confidence: pred.flexible ? "low" : pred.pressureBand,
    };
  } catch {
    sleepPrediction = null;
  }

  return {
    childName: String(child.name ?? "Baby").slice(0, 40),
    ageMonths,
    napSessions14d,
    sleepPrediction,
  };
}

async function getCachedPlan(
  userId: string,
  childId: number,
): Promise<{ plan: InfantSleepCoachPlan; generatedAt: string } | null> {
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
      plan: row.response as InfantSleepCoachPlan,
      generatedAt: row.createdAt.toISOString(),
    };
  } catch (err) {
    logger.warn({ err }, "infant-sleep coach cache read failed");
    return null;
  }
}

/** Cache + analytics after sync or BullMQ poll completion. */
export async function persistInfantSleepCoachPlan(
  userId: string,
  childId: number,
  input: unknown,
  plan: InfantSleepCoachPlan,
): Promise<void> {
  await setCachedPlan(userId, childId, input, plan);
  const ageMonths = (input as { childAgeMonths?: number } | null)?.childAgeMonths;
  void persistInfantProductAnalyticsEvent({
    userId,
    childId,
    childAgeMonths: ageMonths,
    event: "infant_sleep_coach_generated",
    properties: { source: "coach_plan" },
  }).catch(() => undefined);
}

async function setCachedPlan(
  userId: string,
  childId: number,
  input: unknown,
  plan: InfantSleepCoachPlan,
): Promise<void> {
  try {
    const key = cacheKeyFor(userId, childId);
    await db
      .insert(aiCacheTable)
      .values({ cacheKey: key, namespace: INFANT_SLEEP_CACHE_NAMESPACE, input, response: plan })
      .onConflictDoUpdate({
        target: aiCacheTable.cacheKey,
        set: { input, response: plan, createdAt: new Date() },
      });
  } catch (err) {
    logger.warn({ err }, "infant-sleep coach cache write failed");
  }
}

router.get(
  "/infant-sleep/coach-plan/:childId",
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

    if (!isInfantAgeMonths(child.ageMonths)) {
      res.status(400).json({
        error: "age_out_of_range",
        message: "Sleep coach is for babies under 24 months.",
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
  "/infant-sleep/coach-plan",
  requireAuth,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsed = coachPlanBodySchema.safeParse(req.body);
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
    if (!isInfantAgeMonths(ageMonths)) {
      res.status(400).json({
        error: "age_out_of_range",
        message: "Sleep coach is for babies under 24 months.",
      });
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
    await applyFeatureGate(req, res, "infant_sleep_coach", () => {
      gateAllowed = true;
    });
    if (!gateAllowed) return;

    const context = await loadSleepContext(
      parsed.data.childId,
      userId,
      parsed.data.tzOffsetMin ?? 0,
    );
    if (!context) {
      res.status(500).json({ error: "context_load_failed" });
      return;
    }

    await submitRouteAiJob({
      routeName: "infant-sleep/coach-plan",
      type: "infant.sleep_coach",
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
        const plan = (result as { plan: InfantSleepCoachPlan }).plan;
        void persistInfantSleepCoachPlan(userId, parsed.data.childId, context, plan);
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

router.post("/infant-sleep/weekly-report", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = reportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    res.status(402).json({
      error: "premium_required",
      feature: "infant_sleep_coach",
      message: "Weekly sleep coaching reports are a Premium feature.",
    });
    return;
  }

  const ageMonths = child.ageMonths;
  if (!isInfantAgeMonths(ageMonths)) {
    res.status(400).json({
      error: "age_out_of_range",
      message: "Weekly sleep reports are for babies under 24 months.",
    });
    return;
  }

  const report = await generateWeeklySleepReport({
    userId,
    childId: child.id,
    childName: child.name ?? "Baby",
    ageMonths,
  });

  res.json({ ok: true, report });
});

router.post("/infant-sleep/schedule-weekly-report", async (req, res): Promise<void> => {
  const cronSecret = process.env["CRON_SECRET"];
  const header = req.headers["x-cron-secret"];
  if (cronSecret && header !== cronSecret) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json({
    ok: true,
    status: "stub",
    message:
      "Weekly sleep report push delivery is not yet implemented. Users can opt in via weeklySleepReport notification pref; cron will evaluate prefs in a future release.",
    notificationKind: "sleep_weekly_report",
  });
});

export default router;
