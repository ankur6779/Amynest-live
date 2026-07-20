/**
 * Production 48-hour autonomous monitor — 48h @ 60s on Hetzner.
 * Runs under systemd; survives SSH disconnect and laptop shutdown.
 * Persists probe cycles locally; does not modify production.
 */
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  GAP_INVALIDATE_MS,
  probeCompositeHealth,
  persistProbeRecords,
  type CompositeHealthResult,
} from "./hardened-probe";
import { apiUrl } from "./probes";
import { auditDir } from "./repo-root";
import { parseArgs } from "./cli-args";

const execFileAsync = promisify(execFile);

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_DURATION_MS = 48 * 60 * 60 * 1000;

type BullMqStats = {
  wait: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

type CycleRecord = {
  timestamp: string;
  cycle_id: string;
  cycle_index: number;
  production_plane: "coolify";
  render_standby_healthy: boolean;
  coolify_healthy: boolean;
  composite_failure: boolean;
  consecutive_unhealthy: number;
  gap_invalidated: boolean;
  http: {
    render: Record<string, number>;
    coolify: Record<string, number>;
  };
  latency_ms: {
    render: number[];
    coolify: number[];
  };
  worker: {
    ok: boolean;
    restarts: number;
    cpu: string | null;
    memory: string | null;
    error?: string;
  };
  bullmq: BullMqStats | { error: string };
  ai_jobs: BullMqStats | { error: string };
  redis: { ok: boolean; error?: string };
  postgres: { ok: boolean; error?: string };
  scheduler: {
    render_owner: boolean | null;
    coolify_owner: boolean | null;
    active_plane: string | null;
  };
  docker: {
    worker: string | null;
    coolify_proxy: string | null;
  };
  traefik: { ok: boolean; detail: string | null };
  gcs: { render_ok: boolean; coolify_ok: boolean };
  routes: { revenuecat_status: number; razorpay_status: number };
  host: {
    loadavg: number[];
    memory_total_bytes: number;
    memory_free_bytes: number;
    memory_used_bytes: number;
    memory_used_pct: number;
  };
};

type MonitorSummary = {
  started_at: string;
  completed_at: string | null;
  host: string;
  duration_ms: number;
  interval_ms: number;
  total_cycles: number;
  coolify_unhealthy_cycles: number;
  render_unhealthy_cycles: number;
  composite_failure_cycles: number;
  max_consecutive_unhealthy: number;
  gap_invalidations: number;
  status: "running" | "complete" | "failed";
};

function envOr(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

async function sh(cmd: string, timeoutMs = 15_000): Promise<string> {
  const { stdout } = await execFileAsync("bash", ["-lc", cmd], {
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
  });
  return stdout.trim();
}

function statusBucket(status: number): string {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500) return "5xx";
  return "other";
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function hostMetrics(): CycleRecord["host"] {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    loadavg: os.loadavg(),
    memory_total_bytes: total,
    memory_free_bytes: free,
    memory_used_bytes: used,
    memory_used_pct: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
  };
}

async function probeRoute(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(15_000) });
    return res.status;
  } catch {
    return 0;
  }
}

async function probeGcs(base: string): Promise<boolean> {
  try {
    const res = await fetch(apiUrl(base, "/healthz/audio"), {
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function collectWorkerMetrics(): Promise<CycleRecord["worker"]> {
  try {
    const healthRaw = await sh("curl -sS -m 5 http://127.0.0.1:9090/health");
    const ok = healthRaw.includes('"ok":true');
    const restarts = Number(
      (await sh("docker inspect amynest-worker --format '{{.RestartCount}}' 2>/dev/null")) || "0",
    );
    const stats = await sh(
      "docker stats amynest-worker --no-stream --format '{{.CPUPerc}}|{{.MemPerc}}' 2>/dev/null",
    );
    const [cpu, memory] = stats.split("|");
    return { ok, restarts, cpu: cpu ?? null, memory: memory ?? null };
  } catch (err) {
    return {
      ok: false,
      restarts: -1,
      cpu: null,
      memory: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function collectBullMq(): Promise<BullMqStats | { error: string }> {
  try {
    const raw = await sh(
      `docker exec amynest-worker node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL,{lazyConnect:true});(async()=>{await r.connect();const o={};for(const q of ['wait','active','completed','failed','delayed']){const k='bull:ai-jobs:'+q;const t=await r.type(k);o[q]=t==='list'?await r.llen(k):t==='zset'?await r.zcard(k):0;}console.log(JSON.stringify(o));await r.quit();})().catch(e=>{console.log(JSON.stringify({error:e.message}));process.exit(1);});"`,
    );
    const parsed = JSON.parse(raw) as BullMqStats & { error?: string };
    if (parsed.error) return { error: parsed.error };
    return parsed;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function collectRedis(): Promise<{ ok: boolean; error?: string }> {
  try {
    const raw = await sh(
      `docker exec amynest-worker node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL,{lazyConnect:true});(async()=>{await r.connect();const p=await r.ping();console.log(p);await r.quit();})();"`,
    );
    return { ok: raw === "PONG" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function collectPostgres(
  coolify: CompositeHealthResult,
  secret?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const raw = await sh(
      `docker exec amynest-worker node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});(async()=>{await c.connect();await c.query('SELECT 1');await c.end();console.log('ok');})().catch(e=>{console.error(e.message);process.exit(1);});"`,
    );
    if (raw.includes("ok")) return { ok: true };
  } catch {
    // fall through to healthz/env signal
  }
  if (secret) {
    try {
      const res = await fetch(apiUrl(coolify.base_url, "/healthz/env"), {
        headers: { "x-health-secret": secret },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const body = (await res.json()) as { db?: { ok?: boolean }; database?: { ok?: boolean } };
        const ok = Boolean(body.db?.ok ?? body.database?.ok ?? coolify.healthy);
        return { ok };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: coolify.healthy };
}

async function parseScheduler(
  composite: CompositeHealthResult,
  secret?: string,
): Promise<CycleRecord["scheduler"]> {
  if (!secret) return { render_owner: null, coolify_owner: null, active_plane: null };
  try {
    const res = await fetch(apiUrl(composite.base_url, "/healthz/env"), {
      headers: { "x-health-secret": secret },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { render_owner: null, coolify_owner: null, active_plane: null };
    const body = (await res.json()) as {
      schedulerOwner?: boolean;
      scheduler?: { active_plane?: string; owner?: boolean };
    };
    return {
      render_owner: composite.backend === "render" ? Boolean(body.schedulerOwner) : null,
      coolify_owner: composite.backend === "coolify" ? Boolean(body.schedulerOwner) : null,
      active_plane: body.scheduler?.active_plane ?? null,
    };
  } catch {
    return { render_owner: null, coolify_owner: null, active_plane: null };
  }
}

async function collectDockerTraefik(coolifyHost: string): Promise<{
  docker: CycleRecord["docker"];
  traefik: CycleRecord["traefik"];
}> {
  let workerStatus: string | null = null;
  let coolifyProxy: string | null = null;
  try {
    workerStatus = await sh(
      "docker ps --filter name=amynest-worker --format '{{.Names}} {{.Status}}'",
    );
  } catch {
    workerStatus = null;
  }
  try {
    coolifyProxy = await sh(
      `ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=accept-new root@${coolifyHost} "docker ps --filter name=coolify-proxy --format '{{.Names}} {{.Status}}'" 2>/dev/null || true`,
    );
    if (!coolifyProxy) coolifyProxy = null;
  } catch {
    coolifyProxy = null;
  }
  const traefikOk = Boolean(coolifyProxy?.includes("Up"));
  return {
    docker: { worker: workerStatus, coolify_proxy: coolifyProxy },
    traefik: { ok: traefikOk, detail: coolifyProxy },
  };
}

function compositeFailed(render: CompositeHealthResult, coolify: CompositeHealthResult): boolean {
  return !render.healthy || !coolify.healthy;
}

async function writeSummary(summary: MonitorSummary): Promise<void> {
  const dir = auditDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "production-48h-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const coolifyUrl = envOr(
    "COOLIFY_API_URL",
    "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io",
  );
  const renderUrl = envOr("RENDER_API_URL", "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io");
  const coolifyHost = envOr("COOLIFY_SSH_HOST", "188.245.208.126");
  const healthSecret = envOr("INTERNAL_HEALTH_SECRET");
  const intervalMs = Number(envOr("MONITOR_INTERVAL_MS", String(DEFAULT_INTERVAL_MS)));
  const durationMs = Number(
    args.duration_ms ?? envOr("PRODUCTION_MONITOR_DURATION_MS", String(DEFAULT_DURATION_MS)),
  );

  const dir = auditDir();
  await mkdir(dir, { recursive: true });
  const cyclesFile = path.join(dir, "production-48h-cycles.jsonl");
  const logFile = path.join(dir, "production-48h.log");

  const startedAt = new Date();
  const endAt = startedAt.getTime() + durationMs;
  let lastAt: number | null = null;
  let coolifyUnhealthy = 0;
  let renderUnhealthy = 0;
  let compositeFailures = 0;
  let gapInvalidations = 0;
  let consecutiveUnhealthy = 0;
  let maxConsecutiveUnhealthy = 0;
  let cycleIndex = 0;

  const runningSummary: MonitorSummary = {
    started_at: startedAt.toISOString(),
    completed_at: null,
    host: os.hostname(),
    duration_ms: durationMs,
    interval_ms: intervalMs,
    total_cycles: 0,
    coolify_unhealthy_cycles: 0,
    render_unhealthy_cycles: 0,
    composite_failure_cycles: 0,
    max_consecutive_unhealthy: 0,
    gap_invalidations: 0,
    status: "running",
  };
  await writeSummary(runningSummary);

  await appendFile(
    logFile,
    `${startedAt.toISOString()} Production 48h monitor started (${durationMs / 3600000}h @ ${intervalMs / 1000}s)\n`,
  );

  while (Date.now() < endAt) {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const cycleId = randomUUID();
    let gapInvalidated = false;

    if (lastAt !== null && now - lastAt > GAP_INVALIDATE_MS) {
      gapInvalidated = true;
      gapInvalidations += 1;
    }
    lastAt = now;

    const [render, coolify] = await Promise.all([
      probeCompositeHealth("render", renderUrl, cycleId, healthSecret || undefined),
      probeCompositeHealth("coolify", coolifyUrl, cycleId, healthSecret || undefined),
    ]);

    await persistProbeRecords(render, path.join(dir, "production-48h-probe-log.jsonl"));
    await persistProbeRecords(coolify, path.join(dir, "production-48h-probe-log.jsonl"));

    const [worker, bullmq, redis, dockerTraefik, gcsRender, gcsCoolify, rcStatus, rzStatus] =
      await Promise.all([
        collectWorkerMetrics(),
        collectBullMq(),
        collectRedis(),
        collectDockerTraefik(coolifyHost),
        probeGcs(renderUrl),
        probeGcs(coolifyUrl),
        probeRoute("https://www.amynest.in/api/subscription/webhook"),
        probeRoute("https://www.amynest.in/api/billing/razorpay/webhook"),
      ]);

    const postgres = await collectPostgres(coolify, healthSecret || undefined);

    const schedRender = await parseScheduler(render, healthSecret);
    const schedCoolify = await parseScheduler(coolify, healthSecret);
    const scheduler = {
      render_owner: schedRender.render_owner,
      coolify_owner: schedCoolify.coolify_owner,
      active_plane: schedRender.active_plane ?? schedCoolify.active_plane,
    };

    const httpRender: Record<string, number> = {};
    const httpCoolify: Record<string, number> = {};
    const latRender: number[] = [];
    const latCoolify: number[] = [];
    for (const ep of Object.values(render.endpoints)) {
      bump(httpRender, statusBucket(ep.status));
      if (ep.ok) latRender.push(ep.latencyMs);
    }
    for (const ep of Object.values(coolify.endpoints)) {
      bump(httpCoolify, statusBucket(ep.status));
      if (ep.ok) latCoolify.push(ep.latencyMs);
    }

    const compFail = compositeFailed(render, coolify);
    if (!render.healthy) renderUnhealthy += 1;
    if (!coolify.healthy) coolifyUnhealthy += 1;
    if (compFail) compositeFailures += 1;

    if (compFail) {
      consecutiveUnhealthy += 1;
      maxConsecutiveUnhealthy = Math.max(maxConsecutiveUnhealthy, consecutiveUnhealthy);
    } else {
      consecutiveUnhealthy = 0;
    }

    const record: CycleRecord = {
      timestamp: nowIso,
      cycle_id: cycleId,
      cycle_index: cycleIndex,
      production_plane: "coolify",
      render_standby_healthy: render.healthy,
      coolify_healthy: coolify.healthy,
      composite_failure: compFail,
      consecutive_unhealthy: consecutiveUnhealthy,
      gap_invalidated: gapInvalidated,
      http: { render: httpRender, coolify: httpCoolify },
      latency_ms: { render: latRender, coolify: latCoolify },
      worker,
      bullmq,
      ai_jobs: bullmq,
      redis,
      postgres,
      scheduler,
      docker: dockerTraefik.docker,
      traefik: dockerTraefik.traefik,
      gcs: { render_ok: gcsRender, coolify_ok: gcsCoolify },
      routes: { revenuecat_status: rcStatus, razorpay_status: rzStatus },
      host: hostMetrics(),
    };

    await appendFile(cyclesFile, `${JSON.stringify(record)}\n`, "utf8");

    const elapsed = Math.round((now - startedAt.getTime()) / 1000);
    const line = `[${elapsed}s] r=${render.healthy ? "OK" : "BAD"} c=${coolify.healthy ? "OK" : "BAD"} consec=${consecutiveUnhealthy} gaps=${gapInvalidations}\n`;
    await appendFile(logFile, line);

    cycleIndex += 1;
    runningSummary.total_cycles = cycleIndex;
    runningSummary.coolify_unhealthy_cycles = coolifyUnhealthy;
    runningSummary.render_unhealthy_cycles = renderUnhealthy;
    runningSummary.composite_failure_cycles = compositeFailures;
    runningSummary.max_consecutive_unhealthy = maxConsecutiveUnhealthy;
    runningSummary.gap_invalidations = gapInvalidations;
    if (cycleIndex % 10 === 0) {
      await writeSummary(runningSummary);
    }

    const remaining = endAt - Date.now();
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, Math.min(intervalMs, remaining)));
    }
  }

  const completedAt = new Date();
  const finalSummary: MonitorSummary = {
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    host: os.hostname(),
    duration_ms: durationMs,
    interval_ms: intervalMs,
    total_cycles: cycleIndex,
    coolify_unhealthy_cycles: coolifyUnhealthy,
    render_unhealthy_cycles: renderUnhealthy,
    composite_failure_cycles: compositeFailures,
    max_consecutive_unhealthy: maxConsecutiveUnhealthy,
    gap_invalidations: gapInvalidations,
    status: "complete",
  };
  await writeSummary(finalSummary);

  await appendFile(
    logFile,
    `${completedAt.toISOString()} Production 48h monitor complete cycles=${cycleIndex}\n`,
  );

  process.exit(0);
}

main().catch(async (err) => {
  const logFile = path.join(auditDir(), "production-48h.log");
  await appendFile(logFile, `${new Date().toISOString()} FATAL ${String(err)}\n`).catch(() => {});
  const summaryPath = path.join(auditDir(), "production-48h-summary.json");
  try {
    const raw = await import("node:fs/promises").then((m) => m.readFile(summaryPath, "utf8"));
    const summary = JSON.parse(raw) as MonitorSummary;
    summary.status = "failed";
    summary.completed_at = new Date().toISOString();
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  } catch {
    // ignore
  }
  process.exit(1);
});
