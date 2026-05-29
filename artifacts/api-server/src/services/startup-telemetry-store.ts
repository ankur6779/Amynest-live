export type StartupEventRecord = {
  ts: number;
  event: string;
  phase?: string;
  app_version: string;
  previous_version?: string;
  platform: string;
  browser: string;
  route: string;
  react_rendered?: boolean;
  app_core_ready?: boolean;
  meta?: Record<string, unknown>;
};

const MAX_EVENTS = 2000;
const events: StartupEventRecord[] = [];

export function ingestStartupEvent(record: StartupEventRecord): void {
  events.push(record);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function resetStartupTelemetryForTests(): void {
  events.length = 0;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

function durationMsForSession(session: StartupEventRecord[]): {
  reactMs: number | null;
  appCoreMs: number | null;
} {
  const start = session.find((e) => e.event === "startup_phase_entered" && e.phase === "react_render");
  const reactDone = session.find((e) => e.event === "startup_phase_completed" && e.phase === "react_render");
  const appCoreDone = session.find((e) => e.event === "startup_phase_completed" && e.phase === "app_core_ready");
  if (!start) return { reactMs: null, appCoreMs: null };
  return {
    reactMs: reactDone ? reactDone.ts - start.ts : null,
    appCoreMs: appCoreDone ? appCoreDone.ts - start.ts : null,
  };
}

export function getStartupTelemetryStats(): {
  sampleCount: number;
  timeoutRate: number;
  deadlockRate: number;
  bootTimeoutRate: number;
  reactRenderMs: { p50: number; p95: number; p99: number };
  appCoreReadyMs: { p50: number; p95: number; p99: number };
  recent: StartupEventRecord[];
} {
  const recent = events.slice(-100);
  const sessions = new Map<string, StartupEventRecord[]>();
  for (const e of events) {
    const key = `${e.route}|${Math.floor(e.ts / 60_000)}`;
    const list = sessions.get(key) ?? [];
    list.push(e);
    sessions.set(key, list);
  }

  const reactDurations: number[] = [];
  const appCoreDurations: number[] = [];
  let timeouts = 0;
  let deadlocks = 0;
  let bootTimeouts = 0;
  let totalEvents = events.length;

  for (const session of sessions.values()) {
    const d = durationMsForSession(session);
    if (d.reactMs != null && d.reactMs >= 0) reactDurations.push(d.reactMs);
    if (d.appCoreMs != null && d.appCoreMs >= 0) appCoreDurations.push(d.appCoreMs);
  }

  for (const e of events) {
    if (e.event === "startup_timeout") timeouts += 1;
    if (e.event === "startup_deadlock_detected") deadlocks += 1;
    if (e.event === "boot_timeout") bootTimeouts += 1;
  }

  reactDurations.sort((a, b) => a - b);
  appCoreDurations.sort((a, b) => a - b);

  return {
    sampleCount: totalEvents,
    timeoutRate: totalEvents ? timeouts / totalEvents : 0,
    deadlockRate: totalEvents ? deadlocks / totalEvents : 0,
    bootTimeoutRate: totalEvents ? bootTimeouts / totalEvents : 0,
    reactRenderMs: {
      p50: percentile(reactDurations, 50),
      p95: percentile(reactDurations, 95),
      p99: percentile(reactDurations, 99),
    },
    appCoreReadyMs: {
      p50: percentile(appCoreDurations, 50),
      p95: percentile(appCoreDurations, 95),
      p99: percentile(appCoreDurations, 99),
    },
    recent,
  };
}
