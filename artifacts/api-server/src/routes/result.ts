import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { buildJobPollResponse, getJobForPoll, isTerminal } from "../lib/ai-queue-http.js";
import { resolvePollApiBody } from "../lib/ai-job-finalize.js";
import { asyncRoute } from "../middlewares/async-route.js";
import { getOrCreateSubscription, isPremiumNow } from "../services/subscriptionService.js";
import type { AiJobType } from "../queue/types.js";

const router: IRouter = Router();

const PREMIUM_POLL_JOB_TYPES = new Set<AiJobType>([
  "smart-study.next_questions",
  "smart-math-tricks.ai_generate",
  "phonics.load_more_words",
  "phonics.weekly_insight",
  "abacus.tutor",
]);

/**
 * GET /api/result/:jobId — poll async AI job (BullMQ worker result in Redis).
 */
router.get("/result/:jobId", asyncRoute(async (req, res): Promise<void> => {
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

  if (PREMIUM_POLL_JOB_TYPES.has(polled.job.type)) {
    const sub = await getOrCreateSubscription(userId);
    if (!isPremiumNow(sub)) {
      res.status(403).json({
        error: "premium_required",
        message: "Upgrade to view this premium AI result.",
      });
      return;
    }
  }

  const body = buildJobPollResponse(polled.job);
  if (polled.job.status === "completed" && body.result !== undefined) {
    body.result = await resolvePollApiBody(polled.job);
  }
  if (!isTerminal(polled.job.status)) {
    res.status(202).json({ ...body, status: "processing" });
    return;
  }

  res.status(200).json(body);
}));

export default router;
