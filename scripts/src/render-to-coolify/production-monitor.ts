/**
 * AmyNest permanent production monitor — runs on Hetzner under systemd.
 * Probes every 60s; persists status, hourly/daily reports, 30-day history.
 */
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { probeEndpointWithRetries } from "./hardened-probe";

const execFileAsync = promisify(execFile);

const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS ?? 60_000);
const MONITOR_DIR = process.env.AMYNEST_MONITOR_DIR?.trim() || "/opt/amynest/monitor";
const HISTORY_DIR = path.join(MONITOR_DIR, "history");
const CHECKPOINT_FILE = path.join(MONITOR_DIR, "checkpoint.json");
const LATEST_STATUS = path.join(MONITOR_DIR, "latest-status.json");
const HOURLY_REPORT = path.join(MONITOR_DIR, "hourly-report.md");
const DAILY_REPORT = path.join(MONITOR_DIR, "daily-report.md");
const CYCLES_LOG = path.join(MONITOR_DIR, "cycles.jsonl");
const RETENTION_DAYS = 30;

const PRODUCTION_BASE = process.env.PRODUCTION_URL?.trim() || "https://www.amynest.in";
const COOLIFY_URL =
  process.env.COOLIFY_API_URL?.trim() ||
  "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";
const RENDER_URL =
  process.env.RENDER_API_URL?.trim() || "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";
const HEALTH_SECRET = process.env.INTERNAL_HEALTH_SECRET?.trim() || "";

type AlertLevel = "ok" | "warn" | "critical";

type Alert = {
  id: string;
  level: AlertLevel;
  message: string;
  since: string;
};

type Checkpoint = {
  cycle_index: number;
  consecutive_health_failures: number;
  consecutive_cpu_high: number;
  http_samples: Array<{ ts: string; status: number }>;
  worker_restart_count: number;
  scheduler_owner: boolean | null;
  scheduler_active_plane: string | null;
  container_restart_counts: Record<string, number>;
  last_hourly_report: string | null;
  last_daily_report: string | null;
  hourly_cycles: CycleSummary[];
  daily_cycles: CycleSummary[];
  active_critical_alerts: Alert[];
};

type CycleSummary = {
  ts: string;
  production_ok: boolean;
  alerts: string[];
};

type ProductionProbe = {
  endpoint: string;
  url: string;
  ok: boolean;
  status: number;
  latency_ms: number;
  backend_lane?: string;
};

type MonitorStatus = {
  generated_at: string;
  cycle_index: number;
  host: string;
  production_plane: "coolify";
  render_standby: "retired";
  engineering_freeze: true;
  healthy: boolean;
  alerts: Alert[];
  production: {
    probes: ProductionProbe[];
    backend_lane: string | null;
  };
  infrastructure: {
    docker: Record<string, string | null>;
    traefik: { ok: boolean; detail: string | null };
    host: {
      loadavg: number[];
      cpu_count: number;
      memory_total_bytes: number;
      memory_used_bytes: number;
      memory_used_pct: number;
      disk_used_pct: number;
      disk_io_read_kb: number | null;
      disk_io_write_kb: number | null;
    };
  };
  database: {
    ok: boolean;
    pool_available: boolean | null;
    slow_query_hint: string | null;
  };
  redis: {
    ok: boolean;
    memory_bytes: number | null;
    connected_clients: number | null;
  };
  bullmq: {
    wait: number;
    active: number;
    failed: number;
    delayed: number;
    completed: number;
    backlog: number;
    processing_stopped: boolean;
  };
  worker: {
    ok: boolean;
    heartbeat: boolean;
    restart_count: number;
    cpu_pct: string | null;
    memory_pct: string | null;
  };
  scheduler: {
    owner: boolean | null;
    active_plane: string | null;
    singleton_ok: boolean;
    ownership_changed: boolean;
  };
  storage: {
    gcs_ok: boolean;
  };
  ai: {
    queue_processing: boolean;
    completion_rate_1h: number | null;
  };
  standby: {
    render_healthy: boolean;
  };
};

function envOr(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sh(cmd: string, timeoutMs = 20_000): Promise<string> {
  const { stdout } = await execFileAsync("bash", ["-lc", cmd], {
    timeout: timeoutMs,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.trim();
}

function defaultCheckpoint(): Checkpoint {
  return {
    cycle_index: 0,
    consecutive_health_failures: 0,
    consecutive_cpu_high: 0,
    http_samples: [],
    worker_restart_count: 0,
    scheduler_owner: null,
    scheduler_active_plane: null,
    container_restart_counts: {},
    last_hourly_report: null,
    last_daily_report: null,
    hourly_cycles: [],
    daily_cycles: [],
    active_critical_alerts: [],
  };
}

async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const raw = await readFile(CHECKPOINT_FILE, "utf8");
    return { ...defaultCheckpoint(), ...JSON.parse(raw) };
  } catch {
    return defaultCheckpoint();
  }
}

async function saveCheckpoint(cp: Checkpoint): Promise<void> {
  await mkdir(MONITOR_DIR, { recursive: true });
  await writeFile(CHECKPOINT_FILE, `${JSON.stringify(cp, null, 2)}\n`, "utf8");
}

async function probeUrl(url: string, endpoint: string): Promise<ProductionProbe> {
  const result = await probeEndpointWithRetries(url, endpoint);
  return {
    endpoint,
    url,
    ok: result.ok,
    status: result.status,
    latency_ms: result.latencyMs,
  };
}

async function probeProduction(): Promise<{
  probes: ProductionProbe[];
  backend_lane: string | null;
}> {
  const base = PRODUCTION_BASE.replace(/\/$/, "");
  const paths = ["/health", "/api/healthz", "/api/healthz/audio"];
  const probes = await Promise.all(
    paths.map((p) => probeUrl(`${base}${p}`, p)),
  );

  let backend_lane: string | null = null;
  try {
    const res = await fetch(`${base}/api/healthz`, {
      method: "HEAD",
      signal: AbortSignal.timeout(15_000),
    });
    backend_lane = res.headers.get("x-amynest-backend");
  } catch {
    /* ignore */
  }

  for (const p of probes) {
    if (backend_lane) p.backend_lane = backend_lane;
  }

  return { probes, backend_lane };
}

async function probeCoolifyHttp(): Promise<{ health: boolean; healthz: boolean; latency_ms: number }> {
  const started = Date.now();
  let health = false;
  let healthz = false;
  try {
    const headers: Record<string, string> = {};
    if (HEALTH_SECRET) headers["x-health-secret"] = HEALTH_SECRET;
    const [hRes, zRes] = await Promise.all([
      fetch(`${COOLIFY_URL}/health`, { signal: AbortSignal.timeout(10_000) }),
      fetch(`${COOLIFY_URL}/api/healthz`, { signal: AbortSignal.timeout(10_000), headers }),
    ]);
    health = hRes.ok;
    healthz = zRes.ok;
  } catch {
    /* probe failed */
  }
  return { health, healthz, latency_ms: Date.now() - started };
}

async function collectDocker(): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {
    amynest_worker: null,
    coolify_proxy: null,
    coolify_app: null,
  };
  try {
    out.amynest_worker = await sh(
      "docker ps --filter name=amynest-worker --format '{{.Names}} {{.Status}}'",
    );
  } catch {
    /* ignore */
  }
  const coolify = await probeCoolifyHttp();
  if (coolify.health) {
    out.coolify_proxy = `http_probe ok (${coolify.latency_ms}ms)`;
  }
  if (coolify.health && coolify.healthz) {
    out.coolify_app = `http_probe ok (${coolify.latency_ms}ms)`;
  } else if (coolify.health) {
    out.coolify_app = "http_probe health ok, healthz failed";
  }
  return out;
}

async function collectContainerRestarts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  try {
    const workerRestarts = Number(
      (await sh("docker inspect amynest-worker --format '{{.RestartCount}}' 2>/dev/null")) ||
        "0",
    );
    counts.amynest_worker = workerRestarts;
  } catch {
    counts.amynest_worker = -1;
  }
  // Coolify/Traefik restart counts require host SSH — replaced by HTTP health probes.
  counts.coolify_proxy = -1;
  return counts;
}

async function collectDiskIo(): Promise<{ read_kb: number | null; write_kb: number | null }> {
  try {
    const raw = await sh(
      "cat /proc/diskstats | awk '$3 ~ /^[sv]d[a-z]$/ {r+=$6; w+=$10} END {print r, w}'",
    );
    const [r, w] = raw.split(/\s+/).map(Number);
    return {
      read_kb: Number.isFinite(r) ? Math.round(r / 2) : null,
      write_kb: Number.isFinite(w) ? Math.round(w / 2) : null,
    };
  } catch {
    return { read_kb: null, write_kb: null };
  }
}

async function collectDiskUsedPct(): Promise<number> {
  try {
    const raw = await sh("df -P / | awk 'NR==2 {print $5}' | tr -d '%'");
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

async function collectWorker(): Promise<MonitorStatus["worker"]> {
  try {
    const healthRaw = await sh("curl -sS -m 8 http://127.0.0.1:9090/health");
    const health = JSON.parse(healthRaw) as { ok?: boolean };
    const restarts = Number(
      (await sh("docker inspect amynest-worker --format '{{.RestartCount}}' 2>/dev/null")) ||
        "0",
    );
    const stats = await sh(
      "docker stats amynest-worker --no-stream --format '{{.CPUPerc}}|{{.MemPerc}}' 2>/dev/null",
    );
    const [cpu, memory] = stats.split("|");
    return {
      ok: health.ok === true,
      heartbeat: health.ok === true,
      restart_count: restarts,
      cpu_pct: cpu ?? null,
      memory_pct: memory ?? null,
    };
  } catch {
    return {
      ok: false,
      heartbeat: false,
      restart_count: -1,
      cpu_pct: null,
      memory_pct: null,
    };
  }
}

async function collectBullMq(): Promise<MonitorStatus["bullmq"]> {
  try {
    const raw = await sh(
      `docker exec amynest-worker node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL,{lazyConnect:true});(async()=>{await r.connect();const o={};for(const q of ['wait','active','completed','failed','delayed']){const k='bull:ai-jobs:'+q;const t=await r.type(k);o[q]=t==='list'?await r.llen(k):t==='zset'?await r.zcard(k):0;}const prev=await r.get('amynest:monitor:completed_snapshot');await r.set('amynest:monitor:completed_snapshot',String(o.completed));console.log(JSON.stringify({...o,prev_completed:prev?Number(prev):null}));await r.quit();})().catch(e=>{console.log(JSON.stringify({error:e.message}));process.exit(1);});"`,
    );
    const parsed = JSON.parse(raw) as {
      wait: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      prev_completed?: number | null;
      error?: string;
    };
    if (parsed.error) throw new Error(parsed.error);
    const backlog = parsed.wait + parsed.delayed;
    const processing_stopped =
      backlog > 0 && parsed.active === 0 && parsed.wait > 0;
    return {
      wait: parsed.wait,
      active: parsed.active,
      failed: parsed.failed,
      delayed: parsed.delayed,
      completed: parsed.completed,
      backlog,
      processing_stopped,
    };
  } catch {
    return {
      wait: -1,
      active: -1,
      failed: -1,
      delayed: -1,
      completed: -1,
      backlog: -1,
      processing_stopped: true,
    };
  }
}

async function collectRedis(): Promise<MonitorStatus["redis"]> {
  try {
    const raw = await sh(
      `docker exec amynest-worker node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL,{lazyConnect:true});(async()=>{await r.connect();const ping=await r.ping();const info=await r.info('memory');const clients=await r.info('clients');const mem=info.match(/used_memory:(\\d+)/);const cc=clients.match(/connected_clients:(\\d+)/);console.log(JSON.stringify({ping,mem:mem?Number(mem[1]):null,clients:cc?Number(cc[1]):null}));await r.quit();})();"`,
    );
    const parsed = JSON.parse(raw) as {
      ping: string;
      mem: number | null;
      clients: number | null;
    };
    return {
      ok: parsed.ping === "PONG",
      memory_bytes: parsed.mem,
      connected_clients: parsed.clients,
    };
  } catch {
    return { ok: false, memory_bytes: null, connected_clients: null };
  }
}

async function collectDatabase(): Promise<MonitorStatus["database"]> {
  if (!HEALTH_SECRET) {
    return { ok: false, pool_available: null, slow_query_hint: null };
  }
  try {
    const res = await fetch(`${COOLIFY_URL}/api/healthz/env`, {
      headers: { "x-health-secret": HEALTH_SECRET },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return { ok: false, pool_available: null, slow_query_hint: `healthz/env ${res.status}` };
    }
    const body = (await res.json()) as {
      ok?: boolean;
      db?: { ok?: boolean; pool?: unknown };
      database?: { ok?: boolean };
    };
    const dbOk = Boolean(body.db?.ok ?? body.database?.ok ?? body.ok);
    return {
      ok: dbOk,
      pool_available: body.db?.pool != null ? true : null,
      slow_query_hint: null,
    };
  } catch (err) {
    return {
      ok: false,
      pool_available: null,
      slow_query_hint: err instanceof Error ? err.message : String(err),
    };
  }
}

async function collectScheduler(): Promise<{
  owner: boolean | null;
  active_plane: string | null;
}> {
  if (!HEALTH_SECRET) return { owner: null, active_plane: null };
  try {
    const res = await fetch(`${COOLIFY_URL}/api/healthz/env`, {
      headers: { "x-health-secret": HEALTH_SECRET },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { owner: null, active_plane: null };
    const body = (await res.json()) as {
      schedulerOwner?: boolean;
      scheduler?: { owner?: boolean; active_plane?: string | null };
    };
    return {
      owner: body.schedulerOwner ?? body.scheduler?.owner ?? null,
      active_plane: body.scheduler?.active_plane ?? null,
    };
  } catch {
    return { owner: null, active_plane: null };
  }
}

async function probeGcs(): Promise<boolean> {
  try {
    const res = await fetch(`${PRODUCTION_BASE}/api/healthz/audio`, {
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

async function probeRenderStandby(): Promise<boolean> {
  try {
    const res = await fetch(`${RENDER_URL}/health`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

function parseCpuPct(cpu: string | null): number {
  if (!cpu) return 0;
  return Number(cpu.replace("%", "")) || 0;
}

function evaluateAlerts(
  status: MonitorStatus,
  cp: Checkpoint,
  restartCounts: Record<string, number>,
): { alerts: Alert[]; cp: Checkpoint } {
  const alerts: Alert[] = [];
  const now = status.generated_at;
  const productionOk = status.production.probes.every((p) => p.ok);

  cp.http_samples.push({
    ts: now,
    status: status.production.probes.some((p) => p.status >= 500) ? 500 : 200,
  });
  if (cp.http_samples.length > 100) cp.http_samples = cp.http_samples.slice(-100);

  if (!productionOk) cp.consecutive_health_failures += 1;
  else cp.consecutive_health_failures = 0;

  if (cp.consecutive_health_failures >= 3) {
    alerts.push({
      id: "consecutive_health_failures",
      level: "critical",
      message: `${cp.consecutive_health_failures} consecutive production health failures`,
      since: now,
    });
  }

  const fivexx = cp.http_samples.filter((s) => s.status >= 500).length;
  const fivexxRate = cp.http_samples.length ? fivexx / cp.http_samples.length : 0;
  if (fivexxRate > 0.02) {
    alerts.push({
      id: "http_5xx_rate",
      level: "critical",
      message: `HTTP 5xx rate ${(fivexxRate * 100).toFixed(1)}% > 2%`,
      since: now,
    });
  }

  if (cp.worker_restart_count > 0 && status.worker.restart_count > cp.worker_restart_count) {
    alerts.push({
      id: "worker_restart",
      level: "critical",
      message: `Worker restart ${cp.worker_restart_count} → ${status.worker.restart_count}`,
      since: now,
    });
  }
  cp.worker_restart_count = status.worker.restart_count;

  if (!status.database.ok) {
    alerts.push({ id: "postgres_unavailable", level: "critical", message: "PostgreSQL unavailable", since: now });
  }
  if (!status.redis.ok) {
    alerts.push({ id: "redis_unavailable", level: "critical", message: "Redis unavailable", since: now });
  }
  if (status.bullmq.backlog > 100) {
    alerts.push({ id: "bullmq_backlog", level: "critical", message: `BullMQ backlog ${status.bullmq.backlog}`, since: now });
  }
  if (status.bullmq.processing_stopped && status.bullmq.wait > 0) {
    alerts.push({ id: "queue_stopped", level: "critical", message: "Queue processing stopped", since: now });
  }

  if (
    cp.scheduler_owner !== null &&
    status.scheduler.owner !== null &&
    cp.scheduler_owner !== status.scheduler.owner
  ) {
    alerts.push({
      id: "scheduler_ownership_change",
      level: "critical",
      message: `Scheduler owner ${cp.scheduler_owner} → ${status.scheduler.owner}`,
      since: now,
    });
  }
  if (status.scheduler.owner !== null) {
    cp.scheduler_owner = status.scheduler.owner;
    cp.scheduler_active_plane = status.scheduler.active_plane;
  }

  for (const [name, count] of Object.entries(restartCounts)) {
    const prev = cp.container_restart_counts[name];
    if (prev !== undefined && count >= 0 && count > prev) {
      alerts.push({
        id: `container_restart_${name}`,
        level: "critical",
        message: `Container ${name} restarted (${prev} → ${count})`,
        since: now,
      });
    }
  }
  cp.container_restart_counts = restartCounts;

  if (status.infrastructure.host.disk_used_pct > 90) {
    alerts.push({ id: "disk_high", level: "critical", message: `Disk ${status.infrastructure.host.disk_used_pct}%`, since: now });
  }
  if (status.infrastructure.host.memory_used_pct > 90) {
    alerts.push({ id: "memory_high", level: "critical", message: `Memory ${status.infrastructure.host.memory_used_pct}%`, since: now });
  }

  const cpu = parseCpuPct(status.worker.cpu_pct);
  if (cpu > 95) cp.consecutive_cpu_high += 1;
  else cp.consecutive_cpu_high = 0;
  if (cp.consecutive_cpu_high >= 5) {
    alerts.push({
      id: "cpu_high",
      level: "critical",
      message: `CPU > 95% for ${cp.consecutive_cpu_high} min`,
      since: now,
    });
  }

  cp.active_critical_alerts = alerts;
  return { alerts, cp };
}

async function runCycle(cp: Checkpoint): Promise<{ status: MonitorStatus; cp: Checkpoint }> {
  const nowIso = new Date().toISOString();
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const diskIo = await collectDiskIo();
  const diskPct = await collectDiskUsedPct();

  const [production, docker, worker, bullmq, redis, database, scheduler, gcsOk, renderOk, restartCounts] =
    await Promise.all([
      probeProduction(),
      collectDocker(),
      collectWorker(),
      collectBullMq(),
      collectRedis(),
      collectDatabase(),
      collectScheduler(),
      probeGcs(),
      probeRenderStandby(),
      collectContainerRestarts(),
    ]);

  const traefikOk = Boolean(docker.coolify_proxy?.startsWith("http_probe ok"));

  let status: MonitorStatus = {
    generated_at: nowIso,
    cycle_index: cp.cycle_index + 1,
    host: os.hostname(),
    production_plane: "coolify",
    render_standby: "retired",
    engineering_freeze: true,
    healthy: true,
    alerts: [],
    production,
    infrastructure: {
      docker,
      traefik: { ok: traefikOk, detail: docker.coolify_proxy },
      host: {
        loadavg: os.loadavg(),
        cpu_count: os.cpus().length,
        memory_total_bytes: total,
        memory_used_bytes: used,
        memory_used_pct: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
        disk_used_pct: diskPct,
        disk_io_read_kb: diskIo.read_kb,
        disk_io_write_kb: diskIo.write_kb,
      },
    },
    database,
    redis,
    bullmq,
    worker,
    scheduler: {
      owner: scheduler.owner,
      active_plane: scheduler.active_plane,
      singleton_ok: scheduler.owner === true,
      ownership_changed: false,
    },
    storage: { gcs_ok: gcsOk },
    ai: {
      queue_processing: bullmq.active > 0 || (bullmq.wait === 0 && bullmq.failed === 0),
      completion_rate_1h: null,
    },
    standby: { render_healthy: renderOk },
  };

  const evaluated = evaluateAlerts(status, cp, restartCounts);
  status.alerts = evaluated.alerts;
  status.healthy = evaluated.alerts.length === 0 && production.probes.every((p) => p.ok);
  status.scheduler.ownership_changed = evaluated.alerts.some(
    (a) => a.id === "scheduler_ownership_change",
  );

  return { status, cp: { ...evaluated.cp, cycle_index: cp.cycle_index + 1 } };
}

function formatHourlyReport(cp: Checkpoint): string {
  const cycles = cp.hourly_cycles;
  const ok = cycles.filter((c) => c.production_ok).length;
  const crit = cycles.flatMap((c) => c.alerts);
  return `# AmyNest Hourly Production Report

Generated: ${new Date().toISOString()}
Cycles: ${cycles.length}
Production OK: ${ok}/${cycles.length}

## Critical events
${crit.length ? crit.map((a) => `- ${a}`).join("\n") : "- None"}

## Latest checkpoint
- Consecutive health failures: ${cp.consecutive_health_failures}
- Worker restarts (baseline): ${cp.worker_restart_count}
- Scheduler owner: ${cp.scheduler_owner}
`;
}

function formatDailyReport(cp: Checkpoint): string {
  const cycles = cp.daily_cycles;
  const ok = cycles.filter((c) => c.production_ok).length;
  return `# AmyNest Daily Production Report

Generated: ${new Date().toISOString()}
Date: ${new Date().toISOString().slice(0, 10)}
Cycles: ${cycles.length}
Production OK: ${ok}/${cycles.length}
Critical alerts (active): ${cp.active_critical_alerts.length}

## Summary
Production plane: Coolify (100%)
Render: Hot Standby
Engineering Freeze: ACTIVE
`;
}

async function pruneHistory(): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  try {
    const files = await readdir(HISTORY_DIR);
    for (const f of files) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (!m) continue;
      const ts = new Date(`${m[1]}T00:00:00Z`).getTime();
      if (ts < cutoff) await unlink(path.join(HISTORY_DIR, f));
    }
  } catch {
    /* ignore */
  }
}

async function appendHistory(status: MonitorStatus): Promise<void> {
  await mkdir(HISTORY_DIR, { recursive: true });
  const day = status.generated_at.slice(0, 10);
  await appendFile(path.join(HISTORY_DIR, `${day}.jsonl`), `${JSON.stringify(status)}\n`);
}

async function maybeWriteReports(cp: Checkpoint): Promise<Checkpoint> {
  const now = new Date();
  const hourKey = now.toISOString().slice(0, 13);
  const dayKey = now.toISOString().slice(0, 10);

  if (cp.last_hourly_report !== hourKey && cp.hourly_cycles.length > 0) {
    await writeFile(HOURLY_REPORT, formatHourlyReport(cp), "utf8");
    cp.last_hourly_report = hourKey;
    cp.hourly_cycles = [];
  }

  if (cp.last_daily_report !== dayKey && cp.daily_cycles.length > 0) {
    await writeFile(DAILY_REPORT, formatDailyReport(cp), "utf8");
    cp.last_daily_report = dayKey;
    cp.daily_cycles = [];
  }

  return cp;
}

async function main(): Promise<void> {
  await mkdir(MONITOR_DIR, { recursive: true });
  let cp = await loadCheckpoint();

  console.log(
    JSON.stringify({
      evt: "production_monitor.start",
      host: os.hostname(),
      interval_ms: INTERVAL_MS,
      monitor_dir: MONITOR_DIR,
      cycle_index: cp.cycle_index,
    }),
  );

  for (;;) {
    const cycleStart = Date.now();
    try {
      const { status, cp: nextCp } = await runCycle(cp);
      cp = nextCp;

      await writeFile(LATEST_STATUS, `${JSON.stringify(status, null, 2)}\n`, "utf8");
      await appendFile(CYCLES_LOG, `${JSON.stringify({ ts: status.generated_at, healthy: status.healthy, alerts: status.alerts.length })}\n`);
      await appendHistory(status);
      await saveCheckpoint(cp);

      cp.hourly_cycles.push({
        ts: status.generated_at,
        production_ok: status.production.probes.every((p) => p.ok),
        alerts: status.alerts.map((a) => a.message),
      });
      cp.daily_cycles.push({
        ts: status.generated_at,
        production_ok: status.production.probes.every((p) => p.ok),
        alerts: status.alerts.map((a) => a.message),
      });
      if (cp.hourly_cycles.length > 120) cp.hourly_cycles = cp.hourly_cycles.slice(-120);
      if (cp.daily_cycles.length > 2880) cp.daily_cycles = cp.daily_cycles.slice(-2880);

      cp = await maybeWriteReports(cp);
      await saveCheckpoint(cp);

      if (status.alerts.length > 0) {
        console.log(
          JSON.stringify({
            evt: "production_monitor.alert",
            level: "critical",
            alerts: status.alerts,
          }),
        );
      } else {
        console.log(
          JSON.stringify({
            evt: "production_monitor.cycle",
            cycle: status.cycle_index,
            healthy: status.healthy,
            lane: status.production.backend_lane,
          }),
        );
      }

      if (status.cycle_index % 60 === 0) await pruneHistory();
    } catch (err) {
      console.error(
        JSON.stringify({
          evt: "production_monitor.error",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
      await saveCheckpoint(cp);
    }

    const elapsed = Date.now() - cycleStart;
    const wait = Math.max(0, INTERVAL_MS - elapsed);
    await sleep(wait);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ evt: "production_monitor.fatal", message: String(err) }));
  process.exit(1);
});
