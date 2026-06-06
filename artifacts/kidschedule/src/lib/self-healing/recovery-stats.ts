/**
 * Tracks auto-recovered vs manual sessions for admin visibility (Level 11).
 */

import type { RecoveryEvent, RecoveryLevel, RecoveryOutcome } from "@/lib/self-healing/types";

const EVENTS_KEY = "amynest:self-healing:events";
const MAX_EVENTS = 100;

function readEvents(): RecoveryEvent[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as RecoveryEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: RecoveryEvent[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

export function recordRecoveryEvent(event: Omit<RecoveryEvent, "ts">): void {
  const entry: RecoveryEvent = { ...event, ts: Date.now() };
  const events = readEvents();
  events.push(entry);
  writeEvents(events);
  try {
    const w = window as Window & { __amynestRecoveryEvents?: RecoveryEvent[] };
    w.__amynestRecoveryEvents = events;
  } catch {
    /* ignore */
  }
}

export function getRecoveryEvents(): RecoveryEvent[] {
  return readEvents();
}

export function getRecoveryStats(): {
  total: number;
  autoRecovered: number;
  manualRequired: number;
  quarantined: number;
  byLevel: Partial<Record<RecoveryLevel, number>>;
  successRate: number;
} {
  const events = readEvents();
  const autoRecovered = events.filter((e) => e.outcome === "auto_recovered").length;
  const manualRequired = events.filter((e) => e.outcome === "manual_required").length;
  const quarantined = events.filter((e) => e.outcome === "quarantined").length;
  const byLevel: Partial<Record<RecoveryLevel, number>> = {};
  for (const e of events) {
    byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
  }
  const total = events.length;
  const successRate = total > 0 ? Math.round((autoRecovered / total) * 100) : 100;
  return {
    total,
    autoRecovered,
    manualRequired,
    quarantined,
    byLevel,
    successRate,
  };
}
