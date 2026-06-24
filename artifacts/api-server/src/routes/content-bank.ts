import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { hubModuleGate } from "../middlewares/hubModuleGate.js";
import { logger } from "../lib/logger";
import { getOrCreateSubscription, isPremiumNow } from "../services/subscriptionService.js";
import {
  getContentBankFeed,
  getContentBankItem,
  getContentBankManifestForApi,
  getContentBankStatus,
} from "../services/contentBankService.js";

const router: IRouter = Router();

const CategoryParam = z.enum([
  "smart-study",
  "life-skills",
  "event-prep",
  "math-progression",
]);

const ChildQuery = z.object({
  childId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const GATE_BY_CATEGORY: Record<
  z.infer<typeof CategoryParam>,
  "hub_smart_study" | "hub_life_skills" | "hub_event_prep" | "hub_smart_study"
> = {
  "smart-study": "hub_smart_study",
  "life-skills": "hub_life_skills",
  "event-prep": "hub_event_prep",
  "math-progression": "hub_smart_study",
};

function contentBankGateForCategory(cat: z.infer<typeof CategoryParam>) {
  const feature = GATE_BY_CATEGORY[cat];
  if (cat === "smart-study" || cat === "math-progression") {
    return hubModuleGate(feature, { premiumOnly: true, denyStatus: 403 });
  }
  return hubModuleGate(feature);
}

async function resolvePremium(userId: string): Promise<boolean> {
  const sub = await getOrCreateSubscription(userId);
  return isPremiumNow(sub);
}

router.get("/content-bank/manifest", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const manifest = await getContentBankManifestForApi();
    res.json({ ok: true, manifest });
  } catch (err) {
    logger.error(
      `content-bank manifest failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(503).json({ error: "content_bank_unavailable" });
  }
});

router.get("/content-bank/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = ChildQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  try {
    const premium = await resolvePremium(userId);
    const status = await getContentBankStatus(
      userId,
      parsed.data.childId,
      parsed.data.date ?? new Date().toISOString().slice(0, 10),
      premium,
    );
    if (!status) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.json({ ok: true, ...status });
  } catch (err) {
    logger.error(
      `content-bank status failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(503).json({ error: "content_bank_unavailable" });
  }
});

router.get(
  "/content-bank/:category/feed",
  (req, res, next) => {
    const catParsed = CategoryParam.safeParse(req.params.category);
    if (!catParsed.success) {
      res.status(400).json({ error: "invalid_category" });
      return;
    }
    contentBankGateForCategory(catParsed.data)(req, res, next);
  },
  async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const catParsed = CategoryParam.safeParse(req.params.category);
  if (!catParsed.success) {
    res.status(400).json({ error: "invalid_category" });
    return;
  }
  const queryParsed = ChildQuery.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: "invalid_query", issues: queryParsed.error.flatten() });
    return;
  }

  try {
    const premium = await resolvePremium(userId);
    const feed = await getContentBankFeed(
      userId,
      catParsed.data,
      queryParsed.data.childId,
      {
        limit: queryParsed.data.limit,
        offset: queryParsed.data.offset,
        dateIso: queryParsed.data.date,
        isPremium: premium,
      },
    );
    if (!feed) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.json({ ok: true, ...feed });
  } catch (err) {
    logger.error(
      `content-bank feed failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(503).json({ error: "content_bank_unavailable" });
  }
  },
);

router.get(
  "/content-bank/:category/:itemId",
  (req, res, next) => {
    const catParsed = CategoryParam.safeParse(req.params.category);
    if (!catParsed.success) {
      res.status(400).json({ error: "invalid_category" });
      return;
    }
    contentBankGateForCategory(catParsed.data)(req, res, next);
  },
  async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const catParsed = CategoryParam.safeParse(req.params.category);
  if (!catParsed.success) {
    res.status(400).json({ error: "invalid_category" });
    return;
  }
  const queryParsed = ChildQuery.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: "invalid_query", issues: queryParsed.error.flatten() });
    return;
  }
  const itemId = String(req.params.itemId ?? "");
  if (!itemId) {
    res.status(400).json({ error: "invalid_item_id" });
    return;
  }

  try {
    const premium = await resolvePremium(userId);
    const result = await getContentBankItem(
      userId,
      catParsed.data,
      itemId,
      queryParsed.data.childId,
      queryParsed.data.date,
      premium,
    );
    if (!result) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    if ("error" in result) {
      res.status(result.error === "locked" ? 403 : 404).json({ error: result.error });
      return;
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error(
      `content-bank item failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(503).json({ error: "content_bank_unavailable" });
  }
  },
);

export default router;
