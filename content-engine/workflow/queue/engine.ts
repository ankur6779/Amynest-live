import { createHash } from "node:crypto";
import type { QueueJob, QueueMode, WorkflowJobRequest } from "../../types/workflow.js";

export interface WorkflowQueueOptions {
  mode?: QueueMode;
  concurrency?: number;
}

/**
 * In-memory workflow queue with FIFO/priority, delayed jobs,
 * retry queue, dead-letter queue, and concurrency limits.
 */
export class WorkflowQueue {
  private readonly mode: QueueMode;
  private readonly concurrency: number;
  private readonly jobs = new Map<string, QueueJob>();
  private readonly deadLetters: QueueJob[] = [];
  private active = 0;

  constructor(options: WorkflowQueueOptions = {}) {
    this.mode = options.mode ?? "priority";
    this.concurrency = Math.max(1, options.concurrency ?? 1);
  }

  enqueue(
    payload: WorkflowJobRequest,
    options: { priority?: number; delayMs?: number; id?: string } = {},
  ): QueueJob {
    const enqueuedAt = Date.now();
    const delayMs = Math.max(0, options.delayMs ?? payload.delayMs ?? 0);
    const job: QueueJob = {
      id:
        options.id ??
        `qj_${createHash("sha256")
          .update(`${payload.type}|${enqueuedAt}|${Math.random()}`)
          .digest("hex")
          .slice(0, 12)}`,
      payload,
      priority: options.priority ?? payload.priority ?? 0,
      availableAt: enqueuedAt + delayMs,
      enqueuedAt,
      attempts: 0,
      status: delayMs > 0 ? "delayed" : "queued",
    };
    this.jobs.set(job.id, job);
    return structuredClone(job);
  }

  /** Claim the next runnable job if concurrency allows. */
  claim(now = Date.now()): QueueJob | undefined {
    if (this.active >= this.concurrency) return undefined;
    this.promoteDelayed(now);
    const candidates = [...this.jobs.values()].filter(
      (j) => j.status === "queued" && j.availableAt <= now,
    );
    if (candidates.length === 0) return undefined;

    candidates.sort((a, b) => {
      if (this.mode === "priority" && b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });

    return this.activate(candidates[0]!.id);
  }

  /** Claim a specific job when it becomes runnable. */
  claimById(jobId: string, now = Date.now()): QueueJob | undefined {
    if (this.active >= this.concurrency) return undefined;
    this.promoteDelayed(now);
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    if (job.status !== "queued" || job.availableAt > now) return undefined;
    return this.activate(jobId);
  }

  private activate(jobId: string): QueueJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    job.status = "active";
    job.attempts += 1;
    this.active += 1;
    return structuredClone(job);
  }

  complete(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    if (job.status === "active") this.active = Math.max(0, this.active - 1);
    job.status = "completed";
  }

  /** Re-queue a failed job with delay, or move to dead-letter. */
  fail(
    jobId: string,
    options: { retry: boolean; delayMs?: number } = { retry: false },
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    if (job.status === "active") this.active = Math.max(0, this.active - 1);
    if (options.retry) {
      job.status = "delayed";
      job.availableAt = Date.now() + Math.max(0, options.delayMs ?? 0);
      return;
    }
    job.status = "dead-letter";
    this.deadLetters.push(structuredClone(job));
    this.jobs.delete(jobId);
  }

  size(): number {
    return [...this.jobs.values()].filter((j) =>
      ["queued", "delayed", "active"].includes(j.status),
    ).length;
  }

  listDeadLetters(): QueueJob[] {
    return this.deadLetters.map((j) => structuredClone(j));
  }

  list(): QueueJob[] {
    return [...this.jobs.values()].map((j) => structuredClone(j));
  }

  clear(): void {
    this.jobs.clear();
    this.deadLetters.length = 0;
    this.active = 0;
  }

  private promoteDelayed(now: number): void {
    for (const job of this.jobs.values()) {
      if (job.status === "delayed" && job.availableAt <= now) {
        job.status = "queued";
      }
    }
  }
}
