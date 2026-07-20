/**
 * Stage 50 autonomous certification monitor — 90 min @ 30s on Hetzner.
 * Runs under systemd; survives laptop disconnect.
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  CONSECUTIVE_FAILURES_FOR_DEGRADATION,
  GAP_INVALIDATE_MS,
  probeCompositeHealth,
  persistProbeRecords,
  type CompositeHealthResult,
} from "./hardened-probe";
import { apiUrl } from "./probes";
import { auditDir } from "./repo-root";
import { parseArgs } from "./cli-args";

const execFileAsync = promisify(execFile);

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_DURATION_MS = 90 * 60 * 1000;

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
  render_healthy: boolean;
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
};

type SoakSummary = {
  started_at: string;
  completed_at: string;
  host: string;
  duration_ms: number;
  interval_ms: number;
  total_cycles: number;
  coolify_unhealthy_cycles: number;
  render_unhealthy_cycles: number;
  composite_failure_cycles: number;
  max_consecutive_unhealthy: number;
  gap_invalidations: number;
  certified: boolean;
  advance_to_100: boolean;
  rollback_recommended: boolean;
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

async function collectPostgres(): Promise<{ ok: boolean; error?: string }> {
  try {
    const raw = await sh(
      `docker exec amynest-worker node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});(async()=>{await c.connect();await c.query('SELECT 1');await c.end();console.log('ok');})().catch(e=>{console.error(e.message);process.exit(1);});"`,
    );
    return { ok: raw.includes("ok") };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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

function latencyStats(values: number[]): {
  avg: number;
  p50: number;
  p95: number;
  max: number;
} {
  if (!values.length) return { avg: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

async function writeCertification(
  cycles: CycleRecord[],
  summary: SoakSummary,
): Promise<void> {
  const dir = auditDir();
  await mkdir(dir, { recursive: true });

  const allLatencies = cycles.flatMap((c) => [...c.latency_ms.render, ...c.latency_ms.coolify]);
  const lat = latencyStats(allLatencies);
  const httpTotals = { "2xx": 0, "4xx": 0, "5xx": 0, other: 0 };
  for (const c of cycles) {
    for (const m of [c.http.render, c.http.coolify]) {
      for (const [k, v] of Object.entries(m)) {
        if (k in httpTotals) httpTotals[k as keyof typeof httpTotals] += v;
      }
    }
  }

  const firstWorkerMem = cycles[0]?.worker.memory ?? "n/a";
  const lastWorkerMem = cycles[cycles.length - 1]?.worker.memory ?? "n/a";
  const firstBull = cycles[0]?.bullmq;
  const lastBull = cycles[cycles.length - 1]?.bullmq;
  const bullStart =
    firstBull && !("error" in firstBull)
      ? firstBull
      : { wait: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  const bullEnd =
    lastBull && !("error" in lastBull)
      ? lastBull
      : { wait: 0, active: 0, completed: 0, failed: 0, delayed: 0 };

  const score = summary.certified ? 100 : Math.max(0, 100 - summary.max_consecutive_unhealthy * 20);
  const verdict = summary.certified ? "STAGE 50 CERTIFIED" : "STAGE 50 NOT CERTIFIED";

  const md = `# Canary Stage 50% — Autonomous Certification Report

**Generated:** ${summary.completed_at}
**Verdict:** **${verdict}**
**Monitor host:** ${summary.host}
**Duration:** ${summary.duration_ms / 60000} minutes @ ${summary.interval_ms / 1000}s

## Soak results

| Metric | Value |
|--------|-------|
| Total probe cycles | ${summary.total_cycles} |
| Coolify unhealthy cycles | ${summary.coolify_unhealthy_cycles} |
| Render unhealthy cycles | ${summary.render_unhealthy_cycles} |
| Composite failure cycles | ${summary.composite_failure_cycles} |
| Max consecutive unhealthy | ${summary.max_consecutive_unhealthy} |
| Gap invalidations | ${summary.gap_invalidations} |
| Rollback recommended | ${summary.rollback_recommended ? "YES" : "NO"} |
| Advance to 100% executed | ${summary.advance_to_100 ? "YES" : "NO"} |

## Latency (all successful endpoint probes)

| Metric | Value |
|--------|-------|
| Average | ${lat.avg}ms |
| p50 | ${lat.p50}ms |
| p95 | ${lat.p95}ms |
| Maximum | ${lat.max}ms |

## HTTP distribution

| Class | Count |
|-------|------:|
| 2xx | ${httpTotals["2xx"]} |
| 4xx | ${httpTotals["4xx"]} |
| 5xx | ${httpTotals["5xx"]} |
| other | ${httpTotals.other} |

## CPU / memory trend (worker container)

| Metric | Start | End |
|--------|-------|-----|
| CPU | ${cycles[0]?.worker.cpu ?? "n/a"} | ${cycles[cycles.length - 1]?.worker.cpu ?? "n/a"} |
| Memory | ${firstWorkerMem} | ${lastWorkerMem} |

## BullMQ statistics

| Metric | Start | End |
|--------|-------|-----|
| waiting | ${bullStart.wait} | ${bullEnd.wait} |
| active | ${bullStart.active} | ${bullEnd.active} |
| completed | ${bullStart.completed} | ${bullEnd.completed} |
| failed | ${bullStart.failed} | ${bullEnd.failed} |
| delayed | ${bullStart.delayed} | ${bullEnd.delayed} |

## Worker statistics

| Metric | Value |
|--------|-------|
| Heartbeat (final) | ${cycles[cycles.length - 1]?.worker.ok ? "PASS" : "FAIL"} |
| Restarts (final) | ${cycles[cycles.length - 1]?.worker.restarts ?? "n/a"} |

## Redis / PostgreSQL (final cycle)

| Check | Result |
|-------|--------|
| Redis ping | ${cycles[cycles.length - 1]?.redis.ok ? "PASS" : "FAIL"} |
| PostgreSQL SELECT 1 | ${cycles[cycles.length - 1]?.postgres.ok ? "PASS" : "FAIL"} |

## Docker / Traefik (final cycle)

| Component | Status |
|-----------|--------|
| Worker container | ${cycles[cycles.length - 1]?.docker.worker ?? "unknown"} |
| Coolify proxy | ${cycles[cycles.length - 1]?.docker.coolify_proxy ?? "unknown"} |
| Traefik health | ${cycles[cycles.length - 1]?.traefik.ok ? "PASS" : "WARN"} |

## Scheduler (when secret available)

Render owner: ${cycles[cycles.length - 1]?.scheduler.render_owner ?? "n/a"}  
Coolify owner: ${cycles[cycles.length - 1]?.scheduler.coolify_owner ?? "n/a"}  
Active plane: ${cycles[cycles.length - 1]?.scheduler.active_plane ?? "n/a"}

## Overall production health score

**${score}**

## Artifacts

- \`stage50-autonomous-cycles.jsonl\`
- \`stage50-autonomous-summary.json\`
- \`stage50-autonomous.log\`

---
*Autonomous monitor — ${verdict}*
`;

  await writeFile(path.join(dir, "canary-stage-50-certification.md"), md, "utf8");
  await writeFile(
    path.join(dir, "stage50-autonomous-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

async function maybeAdvanceTo100(certified: boolean): Promise<boolean> {
  if (!certified) return false;
  const token = envOr("CLOUDFLARE_API_TOKEN");
  const proxyDir = envOr("CLOUDFLARE_PROXY_DIR", "/opt/amynest/cloudflare-proxy");
  if (!token) {
    await appendFile(
      path.join(auditDir(), "stage50-autonomous.log"),
      `${new Date().toISOString()} SKIP 100% deploy — CLOUDFLARE_API_TOKEN unset\n`,
    );
    return false;
  }
  try {
    await sh(
      `cd '${proxyDir}' && sed -i 's/^CANARY_PERCENT = .*/CANARY_PERCENT = "100"/' wrangler.toml && CLOUDFLARE_API_TOKEN='${token.replace(/'/g, "'\\''")}' npx wrangler deploy 2>&1 | tail -5`,
      120_000,
    );
    const dir = auditDir();
    const post = await Promise.all([
      probeCompositeHealth("render", envOr("RENDER_API_URL"), randomUUID()),
      probeCompositeHealth("coolify", envOr("COOLIFY_API_URL"), randomUUID(), envOr("INTERNAL_HEALTH_SECRET")),
      collectWorkerMetrics(),
      collectBullMq(),
      collectRedis(),
      collectPostgres(),
    ]);
    const md = `# Canary Stage 100% — Start Report (autonomous)

**Generated:** ${new Date().toISOString()}
**Stage:** 100% — full Coolify cutover
**Prior:** Stage 50 autonomous certification PASS

## Post-cutover validation

| Check | Result |
|-------|--------|
| Render composite | ${post[0].healthy ? "PASS" : "FAIL"} |
| Coolify composite | ${post[1].healthy ? "PASS" : "FAIL"} |
| Worker heartbeat | ${post[2].ok ? "PASS" : "FAIL"} |
| BullMQ | ${!("error" in post[3]) ? "PASS" : "FAIL"} |
| Redis | ${post[4].ok ? "PASS" : "FAIL"} |
| PostgreSQL | ${post[5].ok ? "PASS" : "FAIL"} |

**STOP** — 48-hour certification not started automatically.

`;
    await writeFile(path.join(dir, "canary-stage-100-start.md"), md, "utf8");
    return true;
  } catch (err) {
    await appendFile(
      path.join(auditDir(), "stage50-autonomous.log"),
      `${new Date().toISOString()} 100% deploy failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return false;
  }
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
    args.duration_ms ?? envOr("STAGE50_MONITOR_DURATION_MS", String(DEFAULT_DURATION_MS)),
  );

  const dir = auditDir();
  await mkdir(dir, { recursive: true });
  const cyclesFile = path.join(dir, "stage50-autonomous-cycles.jsonl");
  const logFile = path.join(dir, "stage50-autonomous.log");

  const startedAt = new Date();
  const endAt = startedAt.getTime() + durationMs;
  const cycles: CycleRecord[] = [];
  let lastAt: number | null = null;
  let coolifyUnhealthy = 0;
  let renderUnhealthy = 0;
  let compositeFailures = 0;
  let gapInvalidations = 0;
  let consecutiveUnhealthy = 0;
  let maxConsecutiveUnhealthy = 0;
  let cycleIndex = 0;

  await appendFile(
    logFile,
    `${startedAt.toISOString()} Stage 50 autonomous monitor started (${durationMs / 60000}min)\n`,
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

    await persistProbeRecords(render, path.join(dir, "probe-log.jsonl"));
    await persistProbeRecords(coolify, path.join(dir, "probe-log.jsonl"));

    const [worker, bullmq, redis, postgres, dockerTraefik, gcsRender, gcsCoolify, rcStatus, rzStatus] =
      await Promise.all([
        collectWorkerMetrics(),
        collectBullMq(),
        collectRedis(),
        collectPostgres(),
        collectDockerTraefik(coolifyHost),
        probeGcs(renderUrl),
        probeGcs(coolifyUrl),
        probeRoute("https://www.amynest.in/api/subscription/webhook"),
        probeRoute("https://www.amynest.in/api/billing/razorpay/webhook"),
      ]);

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
      render_healthy: render.healthy,
      coolify_healthy: coolify.healthy,
      composite_failure: compFail,
      consecutive_unhealthy: consecutiveUnhealthy,
      gap_invalidated: gapInvalidated,
      http: { render: httpRender, coolify: httpCoolify },
      latency_ms: { render: latRender, coolify: latCoolify },
      worker,
      bullmq,
      redis,
      postgres,
      scheduler,
      docker: dockerTraefik.docker,
      traefik: dockerTraefik.traefik,
      gcs: { render_ok: gcsRender, coolify_ok: gcsCoolify },
      routes: { revenuecat_status: rcStatus, razorpay_status: rzStatus },
    };

    cycles.push(record);
    await appendFile(cyclesFile, `${JSON.stringify(record)}\n`, "utf8");

    const elapsed = Math.round((now - startedAt.getTime()) / 1000);
    const line = `[${elapsed}s] r=${render.healthy ? "OK" : "BAD"} c=${coolify.healthy ? "OK" : "BAD"} consec=${consecutiveUnhealthy} gaps=${gapInvalidations}\n`;
    await appendFile(logFile, line);

    cycleIndex += 1;
    const remaining = endAt - Date.now();
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, Math.min(intervalMs, remaining)));
    }
  }

  const completedAt = new Date();
  const rollbackRecommended = maxConsecutiveUnhealthy >= CONSECUTIVE_FAILURES_FOR_DEGRADATION;
  const certified =
    coolifyUnhealthy === 0 &&
    renderUnhealthy === 0 &&
    !rollbackRecommended &&
    gapInvalidations === 0;

  const summary: SoakSummary = {
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    host: os.hostname(),
    duration_ms: durationMs,
    interval_ms: intervalMs,
    total_cycles: cycles.length,
    coolify_unhealthy_cycles: coolifyUnhealthy,
    render_unhealthy_cycles: renderUnhealthy,
    composite_failure_cycles: compositeFailures,
    max_consecutive_unhealthy: maxConsecutiveUnhealthy,
    gap_invalidations: gapInvalidations,
    certified,
    advance_to_100: false,
    rollback_recommended: rollbackRecommended,
  };

  await writeCertification(cycles, summary);

  if (certified) {
    summary.advance_to_100 = await maybeAdvanceTo100(true);
    await writeFile(
      path.join(dir, "stage50-autonomous-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8",
    );
  }

  await appendFile(
    logFile,
    `${completedAt.toISOString()} Complete certified=${certified} advance=${summary.advance_to_100}\n`,
  );

  process.exit(certified ? 0 : 1);
}

main().catch(async (err) => {
  const logFile = path.join(auditDir(), "stage50-autonomous.log");
  await appendFile(logFile, `${new Date().toISOString()} FATAL ${String(err)}\n`).catch(() => {});
  process.exit(1);
});
