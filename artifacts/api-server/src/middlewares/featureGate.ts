import type { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger.js";
import { db, routinesTable } from "@workspace/db";
import {
  getOrCreateSubscription,
  isPremiumNow,
  incrementFeatureUsage,
  FREE_FEATURE_LIMITS,
  nextResetAtFor,
  type FeatureKey,
} from "../services/subscriptionService.js";

/**
 * Generic per-feature lifetime gate. Same atomic reserve-then-check
 * strategy as `aiUsageGate`, but parameterised so the same middleware
 * powers the Global Paywall: routine generation, behavior log, Amy AI,
 * etc. Premium users bypass entirely.
 *
 * On exceed: returns 402 with a structured payload the frontend can use
 * to open the paywall modal:
 *   { error: "feature_locked", feature, message, limit, used }
 */
/**
 * Routine generation gate — premium bypass; regenerating a saved child+date
 * does not burn a free slot; otherwise uses the 3-day journey quota.
 */
export function routineGenerateGate() {
  return async function routineGenerateGateMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const sub = await getOrCreateSubscription(userId);
      if (isPremiumNow(sub)) {
        next();
        return;
      }

      const body = req.body as { childId?: number; date?: string } | undefined;
      if (typeof body?.childId === "number" && typeof body?.date === "string") {
        const existing = await db
          .select({ id: routinesTable.id })
          .from(routinesTable)
          .where(
            and(
              eq(routinesTable.childId, body.childId),
              eq(routinesTable.date, body.date),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          next();
          return;
        }
      }

      const { assertRoutineCanGenerate, recordRoutineGeneration } = await import(
        "../services/routineJourneyService.js"
      );
      const gate = await assertRoutineCanGenerate(userId);
      if (!gate.ok) {
        res.status(402).json({
          error: "routine_locked",
          feature: "routine_generate",
          message:
            "You've used all 3 free routine generations. Upgrade for unlimited routines.",
          limit: gate.status.access.generationsTotal,
          used: gate.status.access.generationsUsed,
          access: gate.status.access,
        });
        return;
      }

      const origEnd = res.end.bind(res);
      let settled = false;
      res.end = function (...args: unknown[]) {
        if (!settled) {
          settled = true;
          if (
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            typeof body?.childId === "number" &&
            typeof body?.date === "string"
          ) {
            void recordRoutineGeneration(userId, body.childId, body.date).catch(
              () => undefined,
            );
          }
        }
        // @ts-expect-error - express.end has multiple overloads
        return origEnd(...args);
      };
      next();
      return;
    } catch (err) {
      const body = req.body as { childId?: number; date?: string } | undefined;
      logger.error(
        {
          evt: "routine.generate_gate_failed_closed",
          userId: getAuth(req).userId,
          childId: body?.childId,
          date: body?.date,
          message: err instanceof Error ? err.message : String(err),
        },
        "Routine generation gate failed; denying request",
      );
      res.status(503).json({
        error: "entitlement_check_unavailable",
        message: "We could not verify your subscription right now. Please try again shortly.",
      });
      return;
    }
  };
}

export async function applyFeatureGate(
  req: Request,
  res: Response,
  feature: FeatureKey,
  next: NextFunction,
): Promise<void> {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) {
    next();
    return;
  }

  const limit = FREE_FEATURE_LIMITS[feature];
  const newCount = await incrementFeatureUsage(userId, feature, 1);
  if (newCount === 1) {
    const auth = getAuth(req);
    void import("../services/referralService.js")
      .then(({ tryMarkReferralValidForUser }) =>
        tryMarkReferralValidForUser(userId, {
          emailVerified: auth.emailVerified,
          phoneNumber: auth.phoneNumber,
        }),
      )
      .catch(() => undefined);
  }
  if (newCount > limit) {
    await incrementFeatureUsage(userId, feature, -1).catch(() => undefined);
    if (feature === "infant_ai_query") {
      void import("../services/infantAnalyticsIngestService.js")
        .then(({ persistInfantProductAnalyticsEvent }) =>
          persistInfantProductAnalyticsEvent({
            userId,
            event: "infant_ai_quota_reached",
            properties: { limit, used: limit },
          }),
        )
        .catch(() => undefined);
    }
    const resetsAt = nextResetAtFor(feature);
    res.status(402).json({
      error: "feature_locked",
      feature,
      message: resetsAt
        ? "Daily limit reached. Upgrade for unlimited access."
        : "Free trial used. Upgrade to unlock unlimited access.",
      limit,
      used: limit,
      resetsAt,
    });
    return;
  }

  const origEnd = res.end.bind(res);
  let settled = false;
  res.end = function (...args: unknown[]) {
    if (!settled) {
      settled = true;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        void incrementFeatureUsage(userId, feature, -1).catch(() => undefined);
      }
    }
    // @ts-expect-error - express.end has multiple overloads
    return origEnd(...args);
  };
  next();
}

export function featureGate(feature: FeatureKey) {
  return async function featureGateMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await applyFeatureGate(req, res, feature, next);
    } catch (err) {
      logger.error(
        {
          evt: "feature_gate_failed_closed",
          feature,
          userId: getAuth(req).userId,
          message: err instanceof Error ? err.message : String(err),
        },
        "Feature gate failed; denying request",
      );
      if (!res.headersSent) {
        res.status(503).json({
          error: "entitlement_check_unavailable",
          message: "We could not verify your subscription right now. Please try again shortly.",
        });
      }
    }
  };
}
