import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { buildJobPollResponse, getJobForPoll, isTerminal } from "../lib/ai-queue-http.js";

const router: IRouter = Router();

/**
 * GET /api/result/:jobId — poll async AI job (BullMQ worker result in Redis).
 */
router.get("/result/:jobId", async (req, res): Promise<void> => {
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

  const polled = await getJobForPoll(jobId, userId);
  if (polled.status === 404) {
    res.status(404).json({ error: "job_not_found" });
    return;
  }
  if (polled.status === 403) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const body = buildJobPollResponse(polled.job);
  if (!isTerminal(polled.job.status)) {
    res.status(202).json({ ...body, status: "processing" });
    return;
  }

  res.status(200).json(body);
});

export default router;
