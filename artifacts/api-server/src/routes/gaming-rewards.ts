import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  earnPoints,
  getWalletSnapshot,
  recordGamePlay,
  syncWalletFromClient,
  unlockGameForUser,
} from "../services/gamingRewardsService";

const router: IRouter = Router();

router.get("/gaming-rewards/wallet", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const wallet = await getWalletSnapshot(userId);
    res.json({ wallet });
  } catch (err) {
    logger.error(`gaming-rewards GET wallet: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "wallet_fetch_failed" });
  }
});

const SyncBody = z.object({
  pointsBalance: z.number().int().min(0).optional(),
  unlockedGames: z.array(z.string()).optional(),
  skills: z.record(z.string(), z.object({
    attempts: z.number().int().min(0),
    correct: z.number().int().min(0),
    plays: z.number().int().min(0).optional(),
  })).optional(),
  playLog: z.array(z.object({
    id: z.string(),
    date: z.string(),
    pointsEarned: z.number().int(),
    perfect: z.boolean(),
    score: z.number().int().optional(),
    total: z.number().int().optional(),
  })).optional(),
  ledger: z.array(z.object({
    date: z.string(),
    childName: z.string(),
    activity: z.string(),
    points: z.number().int(),
    idempotencyKey: z.string().optional(),
  })).optional(),
});

router.post("/gaming-rewards/sync", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = SyncBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const wallet = await syncWalletFromClient(userId, parsed.data);
    res.json({ wallet });
  } catch (err) {
    logger.error(`gaming-rewards sync: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "sync_failed" });
  }
});

const EarnBody = z.object({
  childName: z.string().min(1).max(80),
  activity: z.string().min(1).max(200),
  amount: z.number().int().min(1).max(50),
  source: z.enum(["routine", "bonus", "dev"]),
  idempotencyKey: z.string().max(120).optional(),
});

router.post("/gaming-rewards/earn", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = EarnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  if (parsed.data.source === "dev" && process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  try {
    const wallet = await earnPoints(userId, parsed.data);
    res.json({ wallet });
  } catch (err) {
    logger.error(`gaming-rewards earn: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "earn_failed" });
  }
});

const UnlockBody = z.object({
  gameId: z.string().min(1).max(64),
});

router.post("/gaming-rewards/unlock", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = UnlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const { snapshot, result } = await unlockGameForUser(userId, parsed.data.gameId);
    if (!result.ok) {
      res.status(400).json({ error: "unlock_failed", reason: result.reason, wallet: snapshot });
      return;
    }
    res.json({ wallet: snapshot, via: result.via });
  } catch (err) {
    logger.error(`gaming-rewards unlock: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "unlock_failed" });
  }
});

const PlayBody = z.object({
  gameId: z.string().min(1).max(64),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

router.post("/gaming-rewards/play", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = PlayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const outcome = await recordGamePlay(userId, parsed.data);
    if (!outcome.ok) {
      res.status(400).json({
        error: "play_failed",
        reason: outcome.error,
        wallet: outcome.snapshot,
      });
      return;
    }
    res.json({
      wallet: outcome.snapshot,
      pointsEarned: outcome.pointsEarned,
      perfect: outcome.perfect,
    });
  } catch (err) {
    logger.error(`gaming-rewards play: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "play_failed" });
  }
});

export default router;
