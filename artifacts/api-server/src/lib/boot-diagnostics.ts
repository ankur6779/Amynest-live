import { logger } from "./logger";
import { resolveAmynestEnv } from "./loadEnv.js";
import { getMemorySnapshot } from "../utils/memory-monitor.js";

/**
 * Boot diagnostics — opt-in instrumentation for diagnosing production crashes.
 *
 * Goal: identify WHERE the API server dies (DB connect, Redis ping, cron init,
 * route registration, OOM, SIGTERM, etc.) without changing default behaviour.
 *
 * All instrumentation here is OPT-IN via env flags:
 *   DIAG_BOOT_LOGS=1          — verbose boot-phase logs (default ON in prod once deployed)
 *   DIAG_LISTEN_DEADLINE_MS=8000 — warn if app.listen has not fired by this deadline
 *   MINIMAL_BOOT=1            — skip cron, worker, route mounting except /health
 *   BOOT_MODULES=db,redis,...  — explicit allowlist for binary-search debugging
 *   BACKGROUND_TASKS_ENABLED=false — skip all post-listen background work
 *
 * Nothing here imports DB or Redis at module load — safe in any environment.
 */

const BOOT_STARTED_AT_MS = Date.now();
let currentPhase: string = "init";
let lastSuccessfulPhase: string = "init";

const DIAG_ON = process.env["DIAG_BOOT_LOGS"]?.trim() !== "0";

export function bootElapsedMs(): number {
  return Date.now() - BOOT_STARTED_AT_MS;
}

export function getCurrentBootPhase(): string {
  return currentPhase;
}

export function getLastSuccessfulBootPhase(): string {
  return lastSuccessfulPhase;
}

/** Mark the beginning of a boot phase; logs with elapsed time. */
export function beginBootPhase(phase: string): void {
  currentPhase = phase;
  if (!DIAG_ON) return;
  logger.info(
    {
      evt: "boot.phase.begin",
      phase,
      elapsedMs: bootElapsedMs(),
      memory: getMemorySnapshot(),
    },
    `boot: ${phase} START`,
  );
}

/** Mark a phase as completed successfully — last successful checkpoint before crash. */
export function endBootPhase(phase: string, extra?: Record<string, unknown>): void {
  lastSuccessfulPhase = phase;
  if (!DIAG_ON) return;
  logger.info(
    {
      evt: "boot.phase.end",
      phase,
      elapsedMs: bootElapsedMs(),
      memory: getMemorySnapshot(),
      ...extra,
    },
    `boot: ${phase} OK`,
  );
}

/**
 * Mark a phase as failed; preserves the previous "last successful" marker.
 * Always logs — failures are critical even when DIAG_BOOT_LOGS is off.
 */
export function failBootPhase(phase: string, err: unknown): void {
  logger.error(
    {
      evt: "boot.phase.fail",
      phase,
      lastSuccessfulPhase,
      elapsedMs: bootElapsedMs(),
      memory: getMemorySnapshot(),
      err,
      errorMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
    `boot: ${phase} FAILED — last success was "${lastSuccessfulPhase}"`,
  );
}

/**
 * Module allowlist for binary-search debugging.
 *
 *   BOOT_MODULES=db,redis,routes,crons,worker  (default — all modules enabled)
 *   BOOT_MODULES=health-only                   (alias: nothing but /health)
 *   BOOT_MODULES=                              (empty — same as health-only)
 *
 * When MINIMAL_BOOT=1 the mask is forced to "health-only".
 */
export type BootModule =
  | "db"
  | "redis"
  | "routes"
  | "crons"
  | "worker"
  | "memory-poll"
  | "loop-detect";

const ALL_MODULES: readonly BootModule[] = [
  "db",
  "redis",
  "routes",
  "crons",
  "worker",
  "memory-poll",
  "loop-detect",
];

function parseModuleMask(): Set<BootModule> {
  if (process.env["MINIMAL_BOOT"]?.trim() === "1") {
    return new Set();
  }
  const raw = process.env["BOOT_MODULES"];
  if (raw === undefined) {
    return new Set(ALL_MODULES);
  }
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "health-only") {
    return new Set();
  }
  const requested = trimmed
    .split(",")
    .map((s) => s.trim().toLowerCase() as BootModule);
  return new Set(requested.filter((m): m is BootModule => (ALL_MODULES as readonly string[]).includes(m)));
}

const moduleMask = parseModuleMask();

export function isMinimalBoot(): boolean {
  return process.env["MINIMAL_BOOT"]?.trim() === "1";
}

/**
 * Post-listen background work (DB ensures, crons, queue bootstrap, seeds).
 * Default: on in development, off in production unless explicitly enabled.
 */
export function isBackgroundTasksEnabled(): boolean {
  const raw = process.env["BACKGROUND_TASKS_ENABLED"]?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "on" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  return resolveAmynestEnv() !== "production";
}

export function isModuleEnabled(module: BootModule): boolean {
  return moduleMask.has(module);
}

export function getEnabledModules(): BootModule[] {
  return Array.from(moduleMask);
}

export function logBootProfile(): void {
  logger.info(
    {
      evt: "boot.profile",
      minimal: process.env["MINIMAL_BOOT"]?.trim() === "1",
      modules: Array.from(moduleMask),
      diagBootLogs: DIAG_ON,
      diagMemoryPoll: process.env["DIAG_MEMORY_POLL"]?.trim() === "1",
      diagLoopDetect: process.env["DIAG_LOOP_DETECT"]?.trim() === "1",
      diagDbVerify: process.env["DIAG_DB_VERIFY"]?.trim() === "1",
      notificationsEnabled:
        process.env["NOTIFICATIONS_ENABLED"]?.trim().toLowerCase() !== "false",
      workerEnabled: process.env["WORKER_ENABLED"] ?? "(default)",
      backgroundTasksEnabled: isBackgroundTasksEnabled(),
      redisUnstable: process.env["REDIS_UNSTABLE"]?.trim() === "1",
      pid: process.pid,
      node: process.version,
    },
    "boot: diagnostic profile",
  );
}

/**
 * Render starter kills services that don't bind PORT within ~10s. If startup
 * is still in DB/Redis init at the deadline, the SIGTERM looks unexplained.
 * This logs a clear warning naming the stuck phase before Render kills us.
 */
let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

export function armListenDeadline(): void {
  const ms = Number(process.env["DIAG_LISTEN_DEADLINE_MS"] ?? "8000");
  if (!Number.isFinite(ms) || ms <= 0) return;
  deadlineTimer = setTimeout(() => {
    logger.error(
      {
        evt: "boot.listen_deadline",
        deadlineMs: ms,
        elapsedMs: bootElapsedMs(),
        lastSuccessfulPhase,
        currentPhase,
        memory: getMemorySnapshot(),
      },
      `boot: HTTP listener not bound within ${ms}ms — Render may kill the service. Stuck in "${currentPhase}".`,
    );
  }, ms);
  deadlineTimer.unref?.();
}

export function disarmListenDeadline(): void {
  if (deadlineTimer) {
    clearTimeout(deadlineTimer);
    deadlineTimer = undefined;
  }
}

/**
 * Enhanced process listeners — exit reason, full stacks, signal info, uptime.
 * Layered on top of registerProcessErrorHandlers() (which only handles unhandled
 * rejections / uncaught exceptions). This adds exit + SIGTERM + SIGINT.
 */
let signalHandlersRegistered = false;

export function registerBootSignalHandlers(): void {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  process.on("SIGTERM", () => {
    logger.error(
      {
        evt: "process.sigterm",
        elapsedMs: bootElapsedMs(),
        uptimeSec: Math.round(process.uptime()),
        currentPhase,
        lastSuccessfulPhase,
        memory: getMemorySnapshot(),
      },
      "Received SIGTERM",
    );
  });

  process.on("SIGINT", () => {
    logger.error(
      {
        evt: "process.sigint",
        elapsedMs: bootElapsedMs(),
        uptimeSec: Math.round(process.uptime()),
        currentPhase,
        lastSuccessfulPhase,
        memory: getMemorySnapshot(),
      },
      "Received SIGINT",
    );
  });

  process.on("exit", (code) => {
    logger.error(
      {
        evt: "process.exit",
        code,
        elapsedMs: bootElapsedMs(),
        uptimeSec: Math.round(process.uptime()),
        currentPhase,
        lastSuccessfulPhase,
      },
      `process.exit(${code}) — last successful phase: ${lastSuccessfulPhase}`,
    );
  });

  process.on("warning", (warning) => {
    logger.warn(
      {
        evt: "process.warning",
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      },
      "Node process warning",
    );
  });
}
