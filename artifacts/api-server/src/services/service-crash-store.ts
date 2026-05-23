/**
 * Service crash detection state — UP / DEGRADED / DOWN with consecutive failure tracking.
 */

export type MonitoredService = "backend" | "worker" | "redis" | "db";
export type ServiceStatus = "UP" | "DEGRADED" | "DOWN";

export type ServiceHeartbeat = {
  service: MonitoredService;
  status: ServiceStatus;
  consecutiveFailures: number;
  lastCheckAt: number;
  lastOkAt: number | null;
  lastError: string | null;
  downSince: number | null;
  degradedSince: number | null;
};

export type ServiceCheckInput = {
  ok: boolean;
  degraded?: boolean;
  error?: string | null;
};

export type ServiceCrashLog = {
  event: "service_crash" | "service_recovery" | "service_degraded";
  service: MonitoredService;
  status: "down" | "up" | "degraded";
  consecutiveFailures?: number;
  error?: string;
};

export type ServiceCrashSnapshot = {
  services: ServiceHeartbeat[];
  downCount: number;
  degradedCount: number;
  generatedAt: number;
};

const FAILURE_THRESHOLD = 3;

const services: Record<MonitoredService, ServiceHeartbeat> = {
  backend: freshHeartbeat("backend"),
  worker: freshHeartbeat("worker"),
  redis: freshHeartbeat("redis"),
  db: freshHeartbeat("db"),
};

function freshHeartbeat(service: MonitoredService): ServiceHeartbeat {
  return {
    service,
    status: "UP",
    consecutiveFailures: 0,
    lastCheckAt: 0,
    lastOkAt: null,
    lastError: null,
    downSince: null,
    degradedSince: null,
  };
}

export function getFailureThreshold(): number {
  return FAILURE_THRESHOLD;
}

export function getServiceHeartbeat(service: MonitoredService): ServiceHeartbeat {
  return { ...services[service] };
}

export function getAllServiceHeartbeats(): ServiceHeartbeat[] {
  return (Object.keys(services) as MonitoredService[]).map((s) => getServiceHeartbeat(s));
}

export function getDownServiceCount(): number {
  return getAllServiceHeartbeats().filter((s) => s.status === "DOWN").length;
}

export function getDegradedServiceCount(): number {
  return getAllServiceHeartbeats().filter((s) => s.status === "DEGRADED").length;
}

export function getServiceCrashSnapshot(now = Date.now()): ServiceCrashSnapshot {
  return {
    services: getAllServiceHeartbeats(),
    downCount: getDownServiceCount(),
    degradedCount: getDegradedServiceCount(),
    generatedAt: now,
  };
}

export type ServiceCheckResult = {
  heartbeat: ServiceHeartbeat;
  transitionedToDown: boolean;
  transitionedToUp: boolean;
  transitionedToDegraded: boolean;
};

export function recordServiceCheck(
  service: MonitoredService,
  input: ServiceCheckInput,
  now = Date.now(),
): ServiceCheckResult {
  const state = services[service];
  const prevStatus = state.status;
  state.lastCheckAt = now;

  if (input.ok && input.degraded) {
    state.consecutiveFailures = 0;
    state.lastOkAt = now;
    state.lastError = input.error?.slice(0, 200) ?? "degraded_latency";
    state.status = "DEGRADED";
    state.downSince = null;
    if (state.degradedSince == null) state.degradedSince = now;
  } else if (input.ok) {
    state.consecutiveFailures = 0;
    state.lastOkAt = now;
    state.lastError = null;
    state.status = "UP";
    state.downSince = null;
    state.degradedSince = null;
  } else {
    state.consecutiveFailures += 1;
    state.lastError = input.error?.slice(0, 200) ?? "check_failed";
    state.degradedSince = null;
    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
      state.status = "DOWN";
      if (state.downSince == null) state.downSince = now;
    } else if (state.status !== "DOWN") {
      state.status = "UP";
    }
  }

  return {
    heartbeat: { ...state },
    transitionedToDown: prevStatus !== "DOWN" && state.status === "DOWN",
    transitionedToUp: prevStatus === "DOWN" && state.status === "UP",
    transitionedToDegraded: prevStatus !== "DEGRADED" && state.status === "DEGRADED",
  };
}

export function logServiceCrashEvent(
  service: MonitoredService,
  status: "down" | "up" | "degraded",
  extra?: Partial<ServiceCrashLog>,
): ServiceCrashLog {
  return {
    event:
      status === "down"
        ? "service_crash"
        : status === "degraded"
          ? "service_degraded"
          : "service_recovery",
    service,
    status,
    ...extra,
  };
}

/** Test-only reset. */
export function resetServiceCrashStoreForTests(): void {
  for (const key of Object.keys(services) as MonitoredService[]) {
    services[key] = freshHeartbeat(key);
  }
}
