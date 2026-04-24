import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import {
  attributeReferral,
  getReferralStats,
  listReferrals,
  tryGrantReferralReward,
} from "../services/referralService";
import { listGiftTokens } from "../services/giftTokenService";

const router: IRouter = Router();

/**
 * GET /api/referrals/me — referral dashboard payload for the current user.
 * Includes stats, individual referral rows, and any gift tokens owned by the user.
 */
router.get("/referrals/me", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  // Re-evaluate rewards on each fetch — cheap, and self-heals if a webhook
  // arrived while the user wasn't looking at the dashboard.
  await tryGrantReferralReward(userId);
  const [stats, referrals, giftTokens] = await Promise.all([
    getReferralStats(userId),
    listReferrals(userId),
    listGiftTokens(userId),
  ]);
  res.json({
    stats,
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      validatedAt: r.validatedAt?.toISOString() ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
    })),
    giftTokens: giftTokens.map((t) => ({
      id: t.id,
      giftCode: t.giftCode,
      bonusDays: t.bonusDays,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
      redeemedAt: t.redeemedAt ? t.redeemedAt.toISOString() : null,
    })),
  });
});

/**
 * POST /api/referrals/attribute
 * Body: { code: string }
 *
 * Records an attribution for the current user. Called by the client right
 * after sign-up / first sign-in if a referral code was captured from the
 * landing page query string.
 */
router.post("/referrals/attribute", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const code = String(req.body?.code ?? "").trim();
  if (!code) {
    res.status(400).json({ error: "missing_code" });
    return;
  }
  const result = await attributeReferral(userId, code);
  if (!result.ok) {
    res.status(400).json({ error: result.reason });
    return;
  }
  res.json({
    ok: true,
    alreadyAttributed: result.alreadyAttributed,
  });
});

export default router;
