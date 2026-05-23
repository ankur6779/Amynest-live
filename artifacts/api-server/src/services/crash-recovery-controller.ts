/**
 * Crash detection + auto recovery — polls heartbeats with jitter, acts on DOWN/UP transitions.
 */

import {
  applyAdminOpsAction,
  applySelfHealInfraFlag,
  getAdminOpsState,
  getSelfHealActorId,
} from "./admin-ops-store.js";
import { healLog, scheduleJitteredInterval, tryHealAction, tryHealRecoveryAction } from "./heal-stability-guard.js";
import { alertServiceDown, alertServiceRecovered } from "./admin-alert-hooks.js";
import { enableSafeMode } from "./self-healing-controller.js";
import {
  defaultServiceProbes,
  type ServiceProbes,
} from "./service-crash-probes.js";
import {
  getDownServiceCount,
  logServiceCrashEvent,
  recordServiceCheck,
  type MonitoredService,
} from "./service-crash-store.js";
import type { SystemMetrics } from "./system-health-store.js";

const POLL_INTERVAL_MS = Number(process.env.CRASH_POLL_INTERVAL_MS ?? 10_000);
const MULTI_DOWN_SAFE_MODE_THRESHOLD = 2;

const SELF_HEAL_ACTOR = getSelfHealActorId();

let pollTimer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null = null;
let started = false;
let activeProbes: ServiceProbes = defaultServiceProbes;

const crashApplied: Record<
  MonitoredService,
  {
    disableApi?: boolean;
    disableStreaming?: boolean;
    safeMode?: boolean;
    pregenerationPaused?: boolean;
    cacheDisabled?: boolean;
    reduceDbReads?: boolean;
  }
> = {
  backend: {},
  worker: {},
  redis: {},
  db: {},
};

function emptyCrashApplied(): void {
  for (const key of Object.keys(crashApplied) as MonitoredService[]) {
    crashApplied[key] = {};
  }
}

function logCrash(payload: ReturnType<typeof logServiceCrashEvent>): void {
  healLog("error", payload, `service ${payload.service} ${payload.status}`, { always: true });
}

function guardedCrashRecovery(action: string, fn: () => void): boolean {
  if (!tryHealRecoveryAction()) return false;
  fn();
  return true;
}

function guardedCrashAction(action: string, fn: () => void): boolean {
  if (!tryHealAction()) return false;
  fn();
  return true;
}

function onBackendDown(): void {
  guardedCrashAction("backend_down", () => {
    const ops = getAdminOpsState();
    if (!ops.disableApi) {
      applyAdminOpsAction("disable_api", SELF_HEAL_ACTOR);
      crashApplied.backend.disableApi = true;
    }
    if (!ops.disableStreaming) {
      applyAdminOpsAction("disable_streaming", SELF_HEAL_ACTOR);
      crashApplied.backend.disableStreaming = true;
    }
    if (!ops.forceEmergencyMode) {
      applyAdminOpsAction("force_emergency", SELF_HEAL_ACTOR);
    }
  });
}

function onBackendDegraded(): void {
  guardedCrashAction("backend_degraded", () => {
    if (!getAdminOpsState().pregenerationPaused) {
      applySelfHealInfraFlag("pregenerationPaused", true);
    }
  });
}

function onBackendUp(): void {
  guardedCrashRecovery("backend_up", () => {
    const applied = crashApplied.backend;
    if (applied.disableApi) applyAdminOpsAction("enable_api", SELF_HEAL_ACTOR);
    if (applied.disableStreaming) applyAdminOpsAction("enable_streaming", SELF_HEAL_ACTOR);
    if (applied.safeMode) {
      applyAdminOpsAction("disable_safe_mode", SELF_HEAL_ACTOR);
    } else if (applied.disableApi || applied.disableStreaming) {
      applyAdminOpsAction("reset_emergency", SELF_HEAL_ACTOR);
    }
    crashApplied.backend = {};
  });
}

function onWorkerDown(): void {
  guardedCrashAction("worker_down", () => {
    if (!getAdminOpsState().pregenerationPaused) {
      applySelfHealInfraFlag("pregenerationPaused", true);
      crashApplied.worker.pregenerationPaused = true;
    }
  });
}

function onWorkerDegraded(): void {
  guardedCrashAction("worker_degraded", () => {
    if (!getAdminOpsState().pregenerationPaused) {
      applySelfHealInfraFlag("pregenerationPaused", true);
    }
  });
}

function onWorkerUp(): void {
  guardedCrashRecovery("worker_up", () => {
    if (crashApplied.worker.pregenerationPaused) {
      applySelfHealInfraFlag("pregenerationPaused", false);
    }
    crashApplied.worker = {};
  });
}

function onRedisDown(): void {
  guardedCrashAction("redis_down", () => {
    if (!getAdminOpsState().cacheDisabled) {
      applySelfHealInfraFlag("cacheDisabled", true);
      crashApplied.redis.cacheDisabled = true;
    }
  });
}

function onRedisUp(): void {
  guardedCrashRecovery("redis_up", () => {
    if (crashApplied.redis.cacheDisabled) {
      applySelfHealInfraFlag("cacheDisabled", false);
    }
    crashApplied.redis = {};
  });
}

function onDbDown(): void {
  guardedCrashAction("db_down", () => {
    if (!getAdminOpsState().reduceDbReads) {
      applySelfHealInfraFlag("reduceDbReads", true);
      crashApplied.db.reduceDbReads = true;
    }
  });
}

function onDbUp(): void {
  guardedCrashRecovery("db_up", () => {
    if (crashApplied.db.reduceDbReads) {
      applySelfHealInfraFlag("reduceDbReads", false);
    }
    crashApplied.db = {};
  });
}

function handleServiceDown(
  service: MonitoredService,
  heartbeat: { consecutiveFailures: number; lastError: string | null },
): void {
  const payload = logServiceCrashEvent(service, "down", {
    consecutiveFailures: heartbeat.consecutiveFailures,
    error: heartbeat.lastError ?? undefined,
  });
  logCrash(payload);

  switch (service) {
    case "backend":
      onBackendDown();
      break;
    case "worker":
      onWorkerDown();
      break;
    case "redis":
      onRedisDown();
      break;
    case "db":
      onDbDown();
      break;
  }

  void alertServiceDown(service, {
    consecutiveFailures: heartbeat.consecutiveFailures,
    error: heartbeat.lastError ?? undefined,
  });

  if (getDownServiceCount() >= MULTI_DOWN_SAFE_MODE_THRESHOLD) {
    const ops = getAdminOpsState();
    if (!ops.safeMode && tryHealAction()) {
      enableSafeMode({
        audioFailureRate: 1,
        fallbackRate: 0,
        avgTTFA: 0,
        streamingStallRate: 0,
        apiErrorRate: 1,
        workerQueueDelayMs: 0,
        cacheHitRate: 0,
        dbLatencyMs: 999,
        redisHealthy: false,
      } satisfies SystemMetrics);
      crashApplied.backend.safeMode = true;
      void alertServiceDown("multiple", { downCount: getDownServiceCount() });
    }
  }
}

function handleServiceDegraded(service: MonitoredService): void {
  const payload = logServiceCrashEvent(service, "degraded");
  healLog("warn", payload, `service ${service} degraded`, { always: true });

  switch (service) {
    case "backend":
      onBackendDegraded();
      break;
    case "worker":
      onWorkerDegraded();
      break;
    case "redis":
    case "db":
      break;
  }
}

function handleServiceUp(service: MonitoredService): void {
  const payload = logServiceCrashEvent(service, "up");
  healLog("info", payload, `service ${service} recovered`, { always: true });
  void alertServiceRecovered(service);

  switch (service) {
    case "backend":
      onBackendUp();
      break;
    case "worker":
      onWorkerUp();
      break;
    case "redis":
      onRedisUp();
      break;
    case "db":
      onDbUp();
      break;
  }

  if (getDownServiceCount() < MULTI_DOWN_SAFE_MODE_THRESHOLD && crashApplied.backend.safeMode) {
    if (tryHealRecoveryAction()) {
      applyAdminOpsAction("disable_safe_mode", SELF_HEAL_ACTOR);
      crashApplied.backend.safeMode = false;
    }
  }
}

async function pollService(service: MonitoredService): Promise<void> {
  const probe = activeProbes[service];
  const result = await probe();
  const check = recordServiceCheck(service, {
    ok: result.ok,
    degraded: result.degraded,
    error: result.error ?? null,
  });

  if (check.transitionedToDown) {
    handleServiceDown(service, check.heartbeat);
  } else if (check.transitionedToDegraded) {
    handleServiceDegraded(service);
  } else if (check.transitionedToUp) {
    handleServiceUp(service);
  }
}

async function runPollTick(): Promise<void> {
  const ops = getAdminOpsState();
  if (!ops.selfHealEnabled) return;

  const services: MonitoredService[] = ["backend", "worker", "redis", "db"];
  await Promise.all(services.map((service) => pollService(service)));
}

export function startCrashRecoveryController(probes: ServiceProbes = defaultServiceProbes): void {
  if (started || process.env.CRASH_RECOVERY_ENABLED === "0") return;
  started = true;
  activeProbes = probes;

  healLog(
    "info",
    { evt: "crash_recovery.start", pollIntervalMs: POLL_INTERVAL_MS },
    "crash recovery controller started",
  );

  void runPollTick();
  pollTimer = scheduleJitteredInterval(POLL_INTERVAL_MS, () => void runPollTick());
}

export function stopCrashRecoveryController(): void {
  if (pollTimer) {
    clearInterval(pollTimer as ReturnType<typeof setInterval>);
    clearTimeout(pollTimer as ReturnType<typeof setTimeout>);
    pollTimer = null;
  }
  started = false;
  activeProbes = defaultServiceProbes;
}

/** Test-only reset. */
export function resetCrashRecoveryControllerForTests(): void {
  stopCrashRecoveryController();
  emptyCrashApplied();
}

/** Test hook — run one poll with injectable probes. */
export async function runCrashPollOnce(probes: ServiceProbes = activeProbes): Promise<void> {
  activeProbes = probes;
  await runPollTick();
}

export { getServiceCrashSnapshot } from "./service-crash-store.js";
