import { randomUUID } from "node:crypto";
import type { AiJobRecord, AiJobStatus, AiJobType } from "./types.js";

const MAX_JOBS = Number(process.env.AI_JOB_STORE_MAX ?? "500");
const TTL_MS = Number(process.env.AI_JOB_STORE_TTL_MS ?? String(20 * 60_000));

const jobs = new Map<string, AiJobRecord>();
const waiters = new Map<string, Set<(job: AiJobRecord) => void>>();

function prune(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > TTL_MS) jobs.delete(id);
  }
  while (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) jobs.delete(oldest[0]);
  }
}

export function createJob(type: AiJobType, userId: string): AiJobRecord {
  prune();
  const now = Date.now();
  const job: AiJobRecord = {
    id: randomUUID(),
    type,
    userId: userId.trim() || "anonymous",
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string): AiJobRecord | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  if (Date.now() - job.updatedAt > TTL_MS) {
    jobs.delete(jobId);
    return undefined;
  }
  return { ...job };
}

export function updateJob(
  jobId: string,
  patch: Partial<Pick<AiJobRecord, "status" | "result" | "error" | "timedOut">>,
): AiJobRecord | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  Object.assign(job, patch, { updatedAt: Date.now() });
  const snapshot = { ...job };
  if (
    snapshot.status === "completed" ||
    snapshot.status === "failed" ||
    snapshot.status === "timed_out"
  ) {
    for (const fn of waiters.get(jobId) ?? []) {
      try {
        fn(snapshot);
      } catch {
        /* ignore waiter errors */
      }
    }
    waiters.delete(jobId);
  }
  return snapshot;
}

export function waitForJob(
  jobId: string,
  timeoutMs: number,
): Promise<AiJobRecord | undefined> {
  const existing = getJob(jobId);
  if (
    existing &&
    (existing.status === "completed" ||
      existing.status === "failed" ||
      existing.status === "timed_out")
  ) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (job: AiJobRecord | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(job);
    };

    const timer = setTimeout(() => finish(getJob(jobId)), timeoutMs);

    const onDone = (job: AiJobRecord) => finish(job);
    let set = waiters.get(jobId);
    if (!set) {
      set = new Set();
      waiters.set(jobId, set);
    }
    set.add(onDone);

    const latest = getJob(jobId);
    if (
      latest &&
      (latest.status === "completed" ||
        latest.status === "failed" ||
        latest.status === "timed_out")
    ) {
      finish(latest);
    }
  });
}

export function listActiveJobsForUser(userId: string): AiJobRecord[] {
  const uid = userId.trim() || "anonymous";
  return [...jobs.values()].filter(
    (j) =>
      j.userId === uid &&
      (j.status === "queued" || j.status === "processing"),
  );
}

export function clearJobStore(): void {
  jobs.clear();
  waiters.clear();
}

export function jobStoreStats(): { size: number; processing: number; queued: number } {
  let processing = 0;
  let queued = 0;
  for (const j of jobs.values()) {
    if (j.status === "processing") processing += 1;
    if (j.status === "queued") queued += 1;
  }
  return { size: jobs.size, processing, queued };
}

export function isTerminal(status: AiJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "timed_out";
}
