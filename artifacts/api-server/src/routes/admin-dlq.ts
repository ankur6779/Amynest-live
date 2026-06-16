/**
 * Admin DLQ — list and replay failed AI jobs.
 */
import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth.js";
import { listDlqEntries, replayDlqEntry } from "../queue/dlq-store.js";

const router: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

router.get("/admin/dlq", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50));
  const entries = await listDlqEntries(limit);
  res.json({ ok: true, count: entries.length, entries });
});

router.post("/admin/dlq/:id/replay", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "missing_id" });
    return;
  }
  const result = await replayDlqEntry(id);
  if (!result.ok) {
    res.status(result.error === "not_found" ? 404 : 502).json(result);
    return;
  }
  res.json({ ok: true, jobId: result.jobId });
});

export default router;
