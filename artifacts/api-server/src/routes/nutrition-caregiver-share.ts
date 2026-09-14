import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth.js";
import {
  getOrCreateSubscription,
  isPremiumNow,
} from "../services/subscriptionService.js";
import {
  createCaregiverShareLink,
  getCaregiverShareView,
} from "../services/caregiverShareService.js";
import { rejectIfIpRateLimited } from "../lib/endpoint-rate-limit.js";

const authRouter: IRouter = Router();

const snapshotSchema = z.object({
  foodStyle: z.string(),
  children: z.array(
    z.object({
      childId: z.number().int().positive(),
      name: z.string(),
      tonightMeal: z.string().nullable(),
      dayLabel: z.string().nullable(),
      mealPlanSlots: z.array(z.object({ slot: z.string(), meal: z.string() })),
      familyPortionMeal: z.string().nullable(),
    }),
  ),
});

authRouter.post("/nutrition/caregiver-share", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    childIds: z.array(z.number().int().positive()).min(1).max(6),
    payload: snapshotSchema,
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    res.status(403).json({
      error: "premium_required",
      message: "Caregiver share links are available for Premium Families.",
    });
    return;
  }

  const result = await createCaregiverShareLink(
    userId,
    parsed.data.childIds,
    parsed.data.payload,
  );
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({
    ok: true,
    shareToken: result.shareToken,
    expiresAt: result.expiresAt,
  });
});

export default authRouter;

/** Public read-only share view — mounted before requireAuth. */
export const nutritionSharePublicRouter: IRouter = Router();

nutritionSharePublicRouter.get("/nutrition/share/:token", async (req, res): Promise<void> => {
  if (
    await rejectIfIpRateLimited(req, res, "nutrition-share", {
      windowMs: 60_000,
      maxPerWindow: 60,
    })
  ) {
    return;
  }

  const token = String(req.params.token ?? "").trim();
  if (!token) {
    res.status(400).json({ error: "invalid_token" });
    return;
  }

  const result = await getCaregiverShareView(token);
  if (!result.ok) {
    res.status(result.error === "expired" ? 410 : 404).json({ error: result.error });
    return;
  }

  res.json(result);
});
