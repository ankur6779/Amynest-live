import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  PARENT_HUB_FEATURES,
  getUserFeatureStatus,
  isTrackedFeature,
  trackFeatureUsage,
} from "../services/featureUsageService";

const router: IRouter = Router();

const trackSchema = z.object({
  featureId: z.string().min(1).max(64),
});

/**
 * GET /api/feature-usage/status
 * Returns the current user's first-use status for every tracked Parent Hub
 * feature. Always returns a complete list — features with no record yet have
 * hasUsedOnce=false.
 */
router.get("/feature-usage/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const features = await getUserFeatureStatus(userId);
    res.json({ features });
  } catch (err) {
    logger.error(
      `feature-usage GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/feature-usage/track  { featureId }
 * Records one usage of a feature. First call flips hasUsedOnce=true.
 * Subsequent calls bump use_count.
 */
router.post("/feature-usage/track", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { featureId } = parsed.data;
  if (!isTrackedFeature(featureId)) {
    res
      .status(400)
      .json({ error: "invalid_feature", allowed: PARENT_HUB_FEATURES });
    return;
  }
  try {
    const result = await trackFeatureUsage(userId, featureId);
    res.json({ ok: true, featureId, ...result });
  } catch (err) {
    logger.error(
      `feature-usage POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
