import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { checkDistributedRateLimit } from "../lib/distributed-rate-limit.js";
import {
  getHealthLabDashboardSnapshot,
  recordHealthLabSyncOutcome,
} from "../services/health-lab-metrics-store.js";
import {
  appendHealthLabSession,
  badgeBodySchema,
  buildDashboardFromProfile,
  getHealthLabProfile,
  questBodySchema,
  sessionBodySchema,
  shopBodySchema,
  streakBodySchema,
  syncBodySchema,
  syncHealthLabProfile,
  verifyChildOwner,
} from "../lib/healthLabProgressService.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";
import {
  assertHealthLabPremium,
  HealthLabPremiumRequiredError,
} from "../services/healthLabPremiumGate.js";

const router: IRouter = Router();

const SYNC_RATE = { windowMs: 60_000, maxPerWindow: 60 };

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

async function healthLabMutationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const rate = await checkDistributedRateLimit(`health-lab:${userId}`, SYNC_RATE);
  if (!rate.allowed) {
    res.status(429).json({ error: "rate_limited", retryAfterMs: rate.retryAfterMs });
    return;
  }
  next();
}

async function authChild(req: { params?: { childId?: string }; body?: { childId?: number } }) {
  const userId = getAuth(req as Parameters<typeof getAuth>[0]).userId;
  if (!userId) return { error: "unauthorized" as const };
  const childId = Number(req.params?.childId ?? req.body?.childId);
  if (!Number.isFinite(childId) || childId <= 0) return { error: "invalid_child" as const };
  const child = await verifyChildOwner(childId, userId);
  if (!child) return { error: "not_found" as const };
  return { userId, childId };
}

function sendHealthLabCaught(res: Response, err: unknown): boolean {
  if (err instanceof HealthLabPremiumRequiredError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return true;
  }
  return false;
}

/** Child ownership first, then the same isPremiumNow used by canAccessHealthLab. */
async function requireHealthLabPremium(
  auth: { userId: string; childId: number },
  res: Response,
): Promise<boolean> {
  try {
    await assertHealthLabPremium(auth.userId);
    return true;
  } catch (err) {
    if (sendHealthLabCaught(res, err)) return false;
    throw err;
  }
}

router.get("/health-lab/profile/:childId", async (req, res): Promise<void> => {
  const auth = await authChild(req);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : auth.error === "not_found" ? 404 : 400).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const data = await getHealthLabProfile(auth.childId, auth.userId);
    if (!data) {
      res.json({ ok: true, profile: null });
      return;
    }
    res.json({ ok: true, ...data });
  } catch (err) {
    logger.error(`health-lab profile get: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/health-lab/dashboard/:childId", async (req, res): Promise<void> => {
  const auth = await authChild(req);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const data = await getHealthLabProfile(auth.childId, auth.userId);
    const dashboard = data ? buildDashboardFromProfile(data.profile) : null;
    res.json({ ok: true, dashboard });
  } catch (err) {
    logger.error(`health-lab dashboard: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/health-lab/history/:childId", async (req, res): Promise<void> => {
  const auth = await authChild(req);
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const data = await getHealthLabProfile(auth.childId, auth.userId);
    const history = data ? (data.profile.gameHistory as unknown[]) ?? [] : [];
    res.json({ ok: true, history });
  } catch (err) {
    logger.error(`health-lab history: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/admin/health-lab/metrics", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json({ ok: true, dashboard: getHealthLabDashboardSnapshot() });
});

router.post("/health-lab/sync", healthLabMutationRateLimit, infantExploreMutationGate(), async (req, res): Promise<void> => {
  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const auth = await authChild({ body: { childId: parsed.data.childId } });
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const row = await syncHealthLabProfile(
      auth.childId,
      auth.userId,
      parsed.data.profile as Record<string, unknown>,
      parsed.data.clientUpdatedAt,
    );
    recordHealthLabSyncOutcome(true);
    res.json({ ok: true, clientUpdatedAt: row.clientUpdatedAt.getTime(), profile: row.profile });
  } catch (err) {
    recordHealthLabSyncOutcome(false);
    logger.error(`health-lab sync: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/health-lab/session", healthLabMutationRateLimit, infantExploreMutationGate(), async (req, res): Promise<void> => {
  const parsed = sessionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const auth = await authChild({ body: { childId: parsed.data.childId } });
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const row = await appendHealthLabSession(
      auth.childId,
      auth.userId,
      parsed.data.session,
      parsed.data.clientUpdatedAt,
    );
    res.json({ ok: true, profile: row.profile });
  } catch (err) {
    logger.error(`health-lab session: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/health-lab/quest", healthLabMutationRateLimit, infantExploreMutationGate(), async (req, res): Promise<void> => {
  const parsed = questBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const auth = await authChild({ body: { childId: parsed.data.childId } });
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const existing = await getHealthLabProfile(auth.childId, auth.userId);
    const profile = (existing?.profile ?? { version: 2, childId: auth.childId }) as Record<string, unknown>;
    const quests = (profile.completedQuests as string[]) ?? [];
    if (!quests.includes(parsed.data.questId)) {
      profile.completedQuests = [...quests, parsed.data.questId];
    }
    const row = await syncHealthLabProfile(auth.childId, auth.userId, profile, parsed.data.clientUpdatedAt);
    res.json({ ok: true, profile: row.profile });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/health-lab/badge", healthLabMutationRateLimit, infantExploreMutationGate(), async (req, res): Promise<void> => {
  const parsed = badgeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const auth = await authChild({ body: { childId: parsed.data.childId } });
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const existing = await getHealthLabProfile(auth.childId, auth.userId);
    const profile = (existing?.profile ?? { version: 2, childId: auth.childId, badges: [] }) as Record<string, unknown>;
    const badges = (profile.badges as { id: string; unlockedAt: number }[]) ?? [];
    if (!badges.some((b) => b.id === parsed.data.badgeId)) {
      profile.badges = [...badges, { id: parsed.data.badgeId, unlockedAt: parsed.data.unlockedAt }];
    }
    const row = await syncHealthLabProfile(auth.childId, auth.userId, profile, parsed.data.clientUpdatedAt);
    res.json({ ok: true, profile: row.profile });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/health-lab/streak", healthLabMutationRateLimit, infantExploreMutationGate(), async (req, res): Promise<void> => {
  const parsed = streakBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const auth = await authChild({ body: { childId: parsed.data.childId } });
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const existing = await getHealthLabProfile(auth.childId, auth.userId);
    const profile = (existing?.profile ?? { version: 2, childId: auth.childId }) as Record<string, unknown>;
    profile.streakDays = Math.max(Number(profile.streakDays ?? 0), parsed.data.streakDays);
    profile.lastPlayDateKey = parsed.data.lastPlayDateKey;
    const row = await syncHealthLabProfile(auth.childId, auth.userId, profile, parsed.data.clientUpdatedAt);
    res.json({ ok: true, profile: row.profile });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/health-lab/shop", healthLabMutationRateLimit, infantExploreMutationGate(), async (req, res): Promise<void> => {
  const parsed = shopBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const auth = await authChild({ body: { childId: parsed.data.childId } });
  if ("error" in auth) {
    res.status(auth.error === "unauthorized" ? 401 : 404).json({ error: auth.error });
    return;
  }
  if (!(await requireHealthLabPremium(auth, res))) return;
  try {
    const existing = await getHealthLabProfile(auth.childId, auth.userId);
    const profile = (existing?.profile ?? { version: 2, childId: auth.childId }) as Record<string, unknown>;
    profile.coins = parsed.data.coins;
    profile.unlockedAvatarItems = parsed.data.unlockedAvatarItems;
    if (parsed.data.equippedItems) profile.equippedItems = parsed.data.equippedItems;
    const row = await syncHealthLabProfile(auth.childId, auth.userId, profile, parsed.data.clientUpdatedAt);
    res.json({ ok: true, profile: row.profile });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
