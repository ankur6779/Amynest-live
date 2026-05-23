/**
 * Heartbeat probes for the central health poller — supports UP / DEGRADED / DOWN.
 */

import { HYSTERESIS } from "./heal-hysteresis.js";

export type ProbeResult = {
  ok: boolean;
  degraded?: boolean;
  latencyMs?: number;
  error?: string;
};

export async function probeBackendHealth(): Promise<ProbeResult> {
  const port = process.env.PORT?.trim();
  if (!port) return { ok: true };

  const start = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, error: `http_${res.status}`, latencyMs };
    const body = (await res.json()) as { ok?: boolean; timestamp?: number };
    if (body.ok !== true || typeof body.timestamp !== "number") {
      return { ok: false, error: "invalid_heartbeat", latencyMs };
    }
    return {
      ok: true,
      latencyMs,
      degraded: latencyMs > HYSTERESIS.dbLatency.degradeAboveMs,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

export async function probeRedisHealth(): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const { isRedisQueueEnabled } = await import("../queue/redis.js");
    if (!isRedisQueueEnabled()) return { ok: true };
    const { verifyRedisConnection } = await import("../queue/redis.js");
    const ok = await verifyRedisConnection();
    const latencyMs = Date.now() - start;
    if (!ok) return { ok: false, error: "redis_ping_failed", latencyMs };
    return {
      ok: true,
      latencyMs,
      degraded: latencyMs > HYSTERESIS.dbLatency.degradeAboveMs,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

export async function probeDbHealth(): Promise<ProbeResult> {
  if (!process.env.DATABASE_URL?.trim()) return { ok: true };
  const start = Date.now();
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      degraded: latencyMs > HYSTERESIS.dbLatency.degradeAboveMs,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

async function measureWorkerQueueDelayMs(): Promise<number> {
  try {
    const { isBullMqActive } = await import("../queue/mode.js");
    if (!isBullMqActive()) return 0;
    const { getAiJobsQueue } = await import("../queue/index.js");
    const queue = getAiJobsQueue();
    const jobs = await queue.getJobs(["waiting", "delayed"], 0, 0, true);
    if (jobs.length === 0) return 0;
    const oldestTs = jobs.reduce(
      (min, job) => Math.min(min, job.timestamp ?? Date.now()),
      Date.now(),
    );
    return Math.max(0, Date.now() - oldestTs);
  } catch {
    return 0;
  }
}

export async function probeWorkerHealth(): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const { isWorkerEnabled, isBullMqActive, isInProcessQueueMode } = await import(
      "../queue/mode.js"
    );
    if (!isWorkerEnabled()) return { ok: true };
    if (isInProcessQueueMode()) return { ok: true };

    const healthUrl = process.env.WORKER_HEALTH_URL?.trim();
    if (healthUrl) {
      const base = healthUrl.replace(/\/$/, "");
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3_000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) return { ok: false, error: `worker_http_${res.status}`, latencyMs };
      const body = (await res.json()) as { ok?: boolean; timestamp?: number };
      if (body.ok !== true) return { ok: false, error: "worker_invalid_heartbeat", latencyMs };
      const queueDelay = await measureWorkerQueueDelayMs();
      return {
        ok: true,
        latencyMs,
        degraded:
          queueDelay > HYSTERESIS.workerDelay.degradeAboveMs ||
          latencyMs > HYSTERESIS.dbLatency.degradeAboveMs,
      };
    }

    if (!isBullMqActive()) {
      return { ok: false, error: "bullmq_inactive", latencyMs: Date.now() - start };
    }

    const { getAiJobsQueue } = await import("../queue/index.js");
    const workers = await getAiJobsQueue().getWorkers();
    const queueDelay = await measureWorkerQueueDelayMs();
    const latencyMs = Date.now() - start;
    if (workers.length === 0) {
      return { ok: false, error: "no_workers_registered", latencyMs };
    }
    return {
      ok: true,
      latencyMs,
      degraded: queueDelay > HYSTERESIS.workerDelay.degradeAboveMs,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

export type ServiceProbes = {
  backend: () => Promise<ProbeResult>;
  worker: () => Promise<ProbeResult>;
  redis: () => Promise<ProbeResult>;
  db: () => Promise<ProbeResult>;
};

export const defaultServiceProbes: ServiceProbes = {
  backend: probeBackendHealth,
  worker: probeWorkerHealth,
  redis: probeRedisHealth,
  db: probeDbHealth,
};
