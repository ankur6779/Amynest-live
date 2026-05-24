import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import {
  executeLearningLoadMore,
  getLoadMoreUsageInfo,
  LEARNING_LOAD_MORE_FEATURES,
  type LearningLoadMoreSection,
} from "../services/learningLoadMoreService.js";

const router: IRouter = Router();

const SectionSchema = z.enum([
  "smart_study",
  "olympiad",
  "spelling",
  "phonics",
  "life_skills",
]);

const LoadMoreBody = z.object({
  section: SectionSchema,
  childId: z.number().int().positive().optional(),
  count: z.number().int().min(1).max(15).optional(),
  excludeIds: z.array(z.string()).max(200).optional(),
  params: z.record(z.unknown()).default({}),
});

/** GET /api/learning/load-more/status?section=smart_study */
router.get("/learning/load-more/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = z.object({ section: SectionSchema }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  const usage = await getLoadMoreUsageInfo(
    userId,
    parsed.data.section as LearningLoadMoreSection,
  );
  res.json({
    ok: true,
    section: parsed.data.section,
    feature: LEARNING_LOAD_MORE_FEATURES[parsed.data.section],
    ...usage,
  });
});

/** POST /api/learning/load-more — gated AI content generation with shared cache. */
router.post("/learning/load-more", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = LoadMoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const result = await executeLearningLoadMore({
    userId,
    section: parsed.data.section,
    childId: parsed.data.childId,
    count: parsed.data.count,
    excludeIds: parsed.data.excludeIds,
    params: parsed.data.params,
  });

  if (!result.ok) {
    if (result.status === 402) {
      res.status(402).json({
        error: "feature_locked",
        feature: result.feature,
        message: "Upgrade or wait for reset to generate more AI content.",
        limit: result.limit,
        used: result.used,
      });
      return;
    }
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result);
});

export default router;
