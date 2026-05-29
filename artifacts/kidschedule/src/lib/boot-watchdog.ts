/**
 * Pure boot watchdog decision logic (canonical).
 * Keep public/boot-watchdog.js in sync — tested via shared vectors.
 */

export type BootWatchdogStartupSnapshot = {
  reactRendered?: boolean;
  lastProgressAt?: number;
} | null;

export type BootWatchdogInput = {
  phases: string[];
  startup: BootWatchdogStartupSnapshot;
  bootWatchdogExtended: boolean;
  now: number;
  /** Ms since lastProgressAt counts as recent activity */
  progressWindowMs?: number;
};

export type BootWatchdogDecision =
  | { action: "ok" }
  | { action: "extend"; extendMs: number }
  | { action: "fail"; reason: "no_react_render" | "no_progress" };

const DEFAULT_PROGRESS_WINDOW_MS = 6000;
const EXTEND_MS = 16_000;

export function evaluateBootWatchdog(input: BootWatchdogInput): BootWatchdogDecision {
  const progressWindowMs = input.progressWindowMs ?? DEFAULT_PROGRESS_WINDOW_MS;

  if (input.phases.includes("react-rendered")) {
    return { action: "ok" };
  }

  if (input.startup?.reactRendered === true) {
    return { action: "ok" };
  }

  const hasBundle = input.phases.includes("bundle-loaded");
  const recentProgress =
    Boolean(
      input.startup?.lastProgressAt &&
        input.now - input.startup.lastProgressAt < progressWindowMs,
    );

  if ((hasBundle || recentProgress) && !input.bootWatchdogExtended) {
    return { action: "extend", extendMs: EXTEND_MS };
  }

  return { action: "fail", reason: "no_react_render" };
}
