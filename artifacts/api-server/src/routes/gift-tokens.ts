import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  listGiftTokens,
  redeemGiftToken,
} from "../services/giftTokenService";

const router: IRouter = Router();

const redeemSchema = z.object({
  giftCode: z.string().min(1).max(32),
});

/**
 * GET /api/gift-tokens
 * Returns the current user's gift tokens (tokens they own and can share).
 */
router.get("/gift-tokens", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const tokens = await listGiftTokens(userId);
    res.json({
      tokens: tokens.map((t) => ({
        id: t.id,
        giftCode: t.giftCode,
        bonusDays: t.bonusDays,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
        redeemedAt: t.redeemedAt ? t.redeemedAt.toISOString() : null,
      })),
    });
  } catch (err) {
    logger.error(`gift-tokens GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/gift-tokens/redeem
 * Body: { giftCode: string }
 *
 * Redeems a gift token for the current user. Grants them bonus premium days.
 */
router.post("/gift-tokens/redeem", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const result = await redeemGiftToken(parsed.data.giftCode, userId);
    if (!result.ok) {
      const httpStatus =
        result.reason === "not_found" ? 404
        : result.reason === "self_redeem" ? 400
        : result.reason === "server_error" ? 500
        : 409; // already_redeemed / expired
      res.status(httpStatus).json({ error: result.reason });
      return;
    }
    res.json({ ok: true, bonusDays: result.bonusDays, giftCode: result.giftCode });
  } catch (err) {
    logger.error(`gift-tokens/redeem failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
