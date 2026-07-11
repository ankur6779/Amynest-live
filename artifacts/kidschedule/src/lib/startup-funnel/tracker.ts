import {
  classifyStartupFunnelEvent,
  type StartupFunnelEventName,
  type StartupFunnelEventPayload,
} from "@workspace/analytics-taxonomy";
import { getStartupState } from "@/lib/startup-orchestrator";
import {
  elapsedMsFromLaunch,
  getStartupFunnelContext,
} from "./context";
import {
  enqueueStartupFunnelEvent,
  flushStartupFunnelQueue,
  installStartupFunnelOnlineFlush,
} from "./queue";
import {
  getOrCreateInstallId,
  isFirstInstallOpen,
  markFirstInstallOpen,
} from "./install";

const firedMilestones = new Set<string>();
let initialized = false;

type TrackOptions = {
  startupPhase?: string;
  meta?: Record<string, string | number | boolean | null>;
  failureStack?: string;
  failureFile?: string;
  failureLine?: number;
  /** Allow duplicate emits (failures may repeat). */
  allowDuplicate?: boolean;
};

function milestoneKey(name: string, sessionId: string): string {
  return `${sessionId}:${name}`;
}

export function initStartupFunnelTelemetry(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  installStartupFunnelOnlineFlush();

  if (typeof navigator !== "undefined") {
    window.addEventListener("offline", () => {
      trackStartupFunnel("network_lost", { allowDuplicate: true });
    });
  }

  const win = window as Window & {
    __amynestFunnelTrack?: (name: string, opts?: TrackOptions) => void;
    __amynestFunnelQueueEarly?: Array<{ name: string; opts?: TrackOptions; ts: number }>;
  };
  win.__amynestFunnelTrack = (name, opts) => {
    trackStartupFunnel(name as StartupFunnelEventName, opts);
  };

  const early = win.__amynestFunnelQueueEarly ?? [];
  for (const item of early) {
    trackStartupFunnel(item.name as StartupFunnelEventName, item.opts);
  }
  win.__amynestFunnelQueueEarly = [];

  if (isFirstInstallOpen()) {
    trackStartupFunnel("app_install_first_open");
    markFirstInstallOpen();
  }
  trackStartupFunnel("app_open");
}

export function trackStartupFunnel(
  eventName: StartupFunnelEventName,
  options: TrackOptions = {},
): void {
  if (typeof window === "undefined") return;

  const ctx = getStartupFunnelContext();
  const key = milestoneKey(eventName, ctx.session_id);
  const eventType = classifyStartupFunnelEvent(eventName);

  if (eventType === "milestone" && !options.allowDuplicate) {
    if (firedMilestones.has(key)) return;
    firedMilestones.add(key);
  }

  let startupPhase = options.startupPhase;
  if (!startupPhase) {
    try {
      startupPhase = getStartupState().phase;
    } catch {
      startupPhase = undefined;
    }
  }

  const payload: StartupFunnelEventPayload = {
    event_name: eventName,
    event_type: eventType,
    client_ts: Date.now(),
    elapsed_ms: elapsedMsFromLaunch(),
    startup_phase: startupPhase,
    ...ctx,
    install_id: getOrCreateInstallId(),
    failure_stack: options.failureStack,
    failure_file: options.failureFile,
    failure_line: options.failureLine,
    meta: {
      href: window.location.href,
      route: window.location.pathname,
      ...options.meta,
    },
  };

  enqueueStartupFunnelEvent(payload);
  void flushStartupFunnelQueue();
}

export function trackStartupFunnelFailure(
  eventName: StartupFunnelEventName,
  err: unknown,
  options: TrackOptions = {},
): void {
  const message = err instanceof Error ? err.message : String(err ?? "unknown");
  const stack = err instanceof Error ? err.stack : undefined;
  trackStartupFunnel(eventName, {
    ...options,
    allowDuplicate: true,
    failureStack: stack ?? message,
    meta: {
      ...options.meta,
      message,
    },
  });
}

export function resetStartupFunnelTelemetryForTests(): void {
  firedMilestones.clear();
  initialized = false;
}

declare global {
  interface Window {
    __amynestFunnelTrack?: (name: string, opts?: TrackOptions) => void;
    __AMYNEST_LAUNCH_TS?: number;
    __AMYNEST_NATIVE_LAUNCH_TS?: number;
  }
}
