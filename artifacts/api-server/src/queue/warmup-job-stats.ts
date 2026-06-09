import { getAiJobsQueue } from "./index.js";
import { isBullMqActive } from "./mode.js";

const RECENT_JOB_SCAN = 100;

export type WarmupJobStats = {
  recentWarmupFailures: number;
  recentWarmupTotal: number;
  warmupSuccessRate: number | null;
};

/** Recent BullMQ audio.warmup completed + failed job counts (read-only). */
export async function collectWarmupJobStats(): Promise<WarmupJobStats> {
  if (!isBullMqActive()) {
    return { recentWarmupFailures: 0, recentWarmupTotal: 0, warmupSuccessRate: null };
  }

  const queue = getAiJobsQueue();
  const [failedJobs, completedJobs] = await Promise.all([
    queue.getJobs(["failed"], 0, RECENT_JOB_SCAN - 1, false),
    queue.getJobs(["completed"], 0, RECENT_JOB_SCAN - 1, false),
  ]);

  const isWarmup = (job: { data?: { type?: string } }) => job.data?.type === "audio.warmup";
  const recentWarmupFailures = failedJobs.filter(isWarmup).length;
  const recentWarmupSuccesses = completedJobs.filter(isWarmup).length;
  const recentWarmupTotal = recentWarmupFailures + recentWarmupSuccesses;
  const warmupSuccessRate =
    recentWarmupTotal > 0 ? recentWarmupSuccesses / recentWarmupTotal : null;

  return { recentWarmupFailures, recentWarmupTotal, warmupSuccessRate };
}
