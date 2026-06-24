import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { childrenTable, db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  patchProgressBodySchema,
  postProgressBodySchema,
  syncBatchBodySchema,
} from "@workspace/phonics-v3-progress";
import {
  getPhonicsV3ProgressBundle,
  patchPhonicsV3Domain,
  postPhonicsV3Progress,
  syncPhonicsV3Progress,
} from "../lib/phonicsV3ProgressService.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";
import { hubModuleGate } from "../middlewares/hubModuleGate.js";

const router: IRouter = Router();

async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

router.get("/phonics/v3/progress/:childId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId) || childId <= 0) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }
  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const progress = await getPhonicsV3ProgressBundle(childId);
    res.json({ ok: true, progress });
  } catch (err) {
    logger.error(`phonics v3 get progress failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.post(
  "/phonics/v3/progress",
  hubModuleGate("hub_phonics", { premiumOnly: true, denyStatus: 403 }),
  infantExploreMutationGate(),
  async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = postProgressBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const child = await loadOwnedChild(parsed.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const progress = await postPhonicsV3Progress(parsed.data.childId, userId, parsed.data);
    res.json({ ok: true, progress });
  } catch (err) {
    logger.error(`phonics v3 post progress failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
  },
);

router.patch(
  "/phonics/v3/progress",
  hubModuleGate("hub_phonics", { premiumOnly: true, denyStatus: 403 }),
  infantExploreMutationGate(),
  async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = patchProgressBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const child = await loadOwnedChild(parsed.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const progress = await patchPhonicsV3Domain(
      parsed.data.childId,
      userId,
      parsed.data.domain,
      parsed.data.payload,
      parsed.data.clientUpdatedAt,
    );
    res.json({ ok: true, progress });
  } catch (err) {
    logger.error(`phonics v3 patch progress failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
  },
);

router.post(
  "/phonics/v3/progress/sync",
  hubModuleGate("hub_phonics", { premiumOnly: true, denyStatus: 403 }),
  infantExploreMutationGate(),
  async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = syncBatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const child = await loadOwnedChild(parsed.data.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const { childId, ...domains } = parsed.data;
    const progress = await syncPhonicsV3Progress(childId, userId, {
      mastery: domains.mastery,
      fluency: domains.fluency,
      stories: domains.stories,
      missions: domains.missions,
      retention: domains.retention,
    });
    res.json({ ok: true, progress });
  } catch (err) {
    logger.error(`phonics v3 sync failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
  },
);

export default router;
