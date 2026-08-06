/**
 * In-memory founder observation store.
 * No network. No analytics. Console / window export only.
 */

import type { FounderObsEvent, FounderObsSummary } from "./types";
import {
  classifyV2Screen,
  isAskAmyPath,
  isCoachPath,
  isMissionPath,
  isTodayPath,
} from "./classify";

const IDLE_MS = 5000;
const MAX_EVENTS = 400;

let startedAt = 0;
let events: FounderObsEvent[] = [];
let screenSequence: string[] = [];
let lastPath = "";
let firstMeaningfulAction: FounderObsSummary["firstMeaningfulAction"] = null;
let timeToFirstMissionMs: number | null = null;
let timeToCoachMs: number | null = null;
let timeToAskAmyMs: number | null = null;
let timeBeforeLeavingTodayMs: number | null = null;
let firstHesitationMs: number | null = null;
let sawToday = false;
let exitPoint: string | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function nowOffset(): number {
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - startedAt);
}

function push(event: Omit<FounderObsEvent, "t"> & { t?: number }): void {
  if (!startedAt) return;
  events.push({
    t: event.t ?? nowOffset(),
    type: event.type,
    detail: event.detail,
    path: event.path,
  });
  if (events.length > MAX_EVENTS) {
    events = events.slice(-MAX_EVENTS);
  }
}

export function resetFounderObservationStore(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  startedAt = 0;
  events = [];
  screenSequence = [];
  lastPath = "";
  firstMeaningfulAction = null;
  timeToFirstMissionMs = null;
  timeToCoachMs = null;
  timeToAskAmyMs = null;
  timeBeforeLeavingTodayMs = null;
  firstHesitationMs = null;
  sawToday = false;
  exitPoint = null;
}

export function startFounderObservationSession(path?: string): void {
  resetFounderObservationStore();
  startedAt = Date.now();
  push({ type: "session_start", detail: "founder_observation" });
  if (path) recordScreen(path);
}

export function isFounderObservationSessionActive(): boolean {
  return startedAt > 0;
}

export function recordScreen(pathname: string): void {
  if (!startedAt) return;
  const path = pathname.split("?")[0] || "/";
  if (path === lastPath) return;
  const prev = lastPath;
  lastPath = path;
  const label = classifyV2Screen(path);
  screenSequence.push(label);
  push({ type: "screen", detail: label, path });

  if (isTodayPath(path)) {
    sawToday = true;
  } else if (sawToday && isTodayPath(prev) && timeBeforeLeavingTodayMs == null) {
    timeBeforeLeavingTodayMs = nowOffset();
    push({
      type: "milestone",
      detail: "left_today",
      path,
      t: timeBeforeLeavingTodayMs,
    });
  }

  if (isMissionPath(path) && timeToFirstMissionMs == null) {
    timeToFirstMissionMs = nowOffset();
    push({
      type: "milestone",
      detail: "first_mission",
      path,
      t: timeToFirstMissionMs,
    });
  }
  if (isCoachPath(path) && timeToCoachMs == null) {
    timeToCoachMs = nowOffset();
    push({
      type: "milestone",
      detail: "first_coach",
      path,
      t: timeToCoachMs,
    });
  }
  if (isAskAmyPath(path) && timeToAskAmyMs == null) {
    timeToAskAmyMs = nowOffset();
    push({
      type: "milestone",
      detail: "first_ask_amy",
      path,
      t: timeToAskAmyMs,
    });
  }
}

export function recordMeaningfulAction(detail: string, pathname?: string): void {
  if (!startedAt || firstMeaningfulAction) return;
  const t = nowOffset();
  const path = pathname?.split("?")[0];
  firstMeaningfulAction = { t, detail, path };
  push({ type: "action", detail, path, t });
  push({ type: "milestone", detail: "first_meaningful_action", path, t });
}

export function recordHesitation(): void {
  if (!startedAt || firstHesitationMs != null) return;
  firstHesitationMs = nowOffset();
  push({
    type: "hesitation",
    detail: "idle_gt_5s",
    path: lastPath || undefined,
    t: firstHesitationMs,
  });
}

export function recordExit(reason: string): void {
  if (!startedAt) return;
  const label = lastPath ? classifyV2Screen(lastPath) : "unknown";
  exitPoint = `${label} (${reason})`;
  push({
    type: "exit",
    detail: reason,
    path: lastPath || undefined,
  });
}

export function noteActivity(): void {
  if (!startedAt) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    recordHesitation();
  }, IDLE_MS);
}

export function getFounderObservationSummary(): FounderObsSummary | null {
  if (!startedAt) return null;
  return {
    sessionStartedAt: new Date(startedAt).toISOString(),
    durationMs: nowOffset(),
    screenSequence: [...screenSequence],
    firstMeaningfulAction,
    timeToFirstMissionMs,
    timeToCoachMs,
    timeToAskAmyMs,
    timeBeforeLeavingTodayMs,
    firstHesitationMs,
    exitPoint,
    events: [...events],
  };
}

export function exportFounderObservationJson(): string {
  const summary = getFounderObservationSummary();
  return JSON.stringify(summary, null, 2);
}

/** Test helpers */
export const __founderObsTest = {
  IDLE_MS,
  getStartedAt: () => startedAt,
  getEvents: () => events,
};
