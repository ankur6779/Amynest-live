import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { getJobForPoll } from "../lib/ai-queue-http.js";
import { isTerminal } from "../queue/ai-job-store.js";

const router: IRouter = Router();

/**
 * GET /api/ai/jobs/:jobId — poll async AI job status/result.
 */
router.get("/ai/jobs/:jobId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const jobId = String(req.params.jobId ?? "");
  if (!jobId) {
    res.status(400).json({ error: "job_id_required" });
    return;
  }

  const polled = getJobForPoll(jobId, userId);
  if (polled.status === 404) {
    res.status(404).json({ error: "job_not_found" });
    return;
  }
  if (polled.status === 403) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const { job } = polled;
  const body: Record<string, unknown> = {
    jobId: job.id,
    status: job.status,
    type: job.type,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  if (isTerminal(job.status)) {
    if (job.status === "completed") body.result = job.result;
    else body.error = job.error ?? "failed";
    if (job.timedOut) body.timedOut = true;
  }

  res.status(isTerminal(job.status) ? 200 : 202).json(body);
});

export default router;
