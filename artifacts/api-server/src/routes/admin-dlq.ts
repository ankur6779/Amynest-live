/**
 * Admin DLQ — list and replay failed AI jobs.
 */
import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/admin-auth.js";
import { listDlqEntries, replayDlqEntry } from "../queue/dlq-store.js";

const router: IRouter = Router();

router.get("/admin/dlq", requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50));
  const entries = await listDlqEntries(limit);
  res.json({ ok: true, count: entries.length, entries });
});

router.post("/admin/dlq/:id/replay", requireAdmin, async (req, res): Promise<void> => {
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
