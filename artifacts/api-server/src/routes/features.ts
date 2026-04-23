import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { featureGate } from "../middlewares/featureGate";
import {
  getEntitlements,
  FREE_FEATURE_LIMITS,
  type FeatureKey,
} from "../services/subscriptionService";

const router: IRouter = Router();

/**
 * Features that have NO server-side work but still need to be gated by the
 * Global Paywall (e.g. client-only TTS audio lessons). The generic
 * `/features/:feature/consume` endpoint reserves a free-tier slot via
 * featureGate and returns the latest entitlements. Other gated features
 * (`ai_query`, `routine_generate`, `behavior_log`) MUST go through their
 * own dedicated routes that perform real work, so they're excluded here.
 */
const ALLOWED_CONSUMABLE: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  "audio_lesson",
]);

router.post(
  "/features/:feature/consume",
  requireAuth,
  (req: Request, res: Response, next: NextFunction): void => {
    const f = req.params.feature as FeatureKey;
    if (!(f in FREE_FEATURE_LIMITS)) {
      res.status(400).json({ error: "unknown_feature" });
      return;
    }
    if (!ALLOWED_CONSUMABLE.has(f)) {
      res.status(400).json({ error: "feature_not_consumable_via_generic_endpoint" });
      return;
    }
    void featureGate(f)(req, res, next);
  },
  async (req: Request, res: Response): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const ent = await getEntitlements(userId);
    res.json({ ok: true, entitlements: ent });
  },
);

export default router;
