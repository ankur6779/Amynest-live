import { getAiJobsQueue } from "./index.js";
import { isBullMqActive } from "./mode.js";

export type FailedAiJobDiagnostic = {
  jobId: string;
  type: string;
  failureReason: string | null;
  failedAt: number | null;
};

/** Read-only snapshot of recent BullMQ failed jobs (admin diagnostics). */
export async function getRecentFailedAiJobDiagnostics(
  limit = 5,
): Promise<FailedAiJobDiagnostic[]> {
  if (!isBullMqActive()) return [];

  const capped = Math.min(Math.max(1, limit), 20);
  const queue = getAiJobsQueue();
  const jobs = await queue.getJobs(["failed"], 0, capped - 1, false);

  return jobs.map((job) => ({
    jobId: String(job.id ?? job.data?.jobId ?? ""),
    type: job.data?.type ?? "unknown",
    failureReason: job.failedReason ?? null,
    failedAt: job.finishedOn ?? null,
  }));
}
