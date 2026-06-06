import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth.js";
import { applyFeatureGate } from "./featureGate.js";
import type { FeatureKey } from "../services/subscriptionService.js";
import { resolveInfantAiQuotaFromDb } from "../lib/infant-child-access.js";

const INFANT_PREMIUM_ENABLED =
  process.env.INFANT_PREMIUM_ENABLED !== "0" &&
  process.env.INFANT_PREMIUM_ENABLED !== "false";

async function resolveAssistantAiFeature(
  req: Request,
  userId: string,
): Promise<FeatureKey> {
  if (!INFANT_PREMIUM_ENABLED) return "ai_query";

  const isInfantContext = await resolveInfantAiQuotaFromDb(userId, req.body);
  return isInfantContext ? "infant_ai_query" : "ai_query";
}

/**
 * Routes Amy AI assistant messages to infant_ai_query (3/day) when the
 * conversation context is an infant, otherwise ai_query (10/day).
 */
export async function assistantAiUsageGate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const feature = await resolveAssistantAiFeature(req, userId);
  await applyFeatureGate(req, res, feature, next);
}
