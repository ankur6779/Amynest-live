/**
 * Front Door start timestamp for WOW (≤90s to first practice success).
 */

import { V2_ANALYTICS_DOOR_STARTED_KEY } from "./storage-keys";

export function readDoorStartedAt(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(V2_ANALYTICS_DOOR_STARTED_KEY);
  } catch {
    return null;
  }
}

/**
 * Record Front Door start once per device/guest analytics lifetime.
 * Idempotent — later opens do not reset the WOW clock.
 */
export function markFrontDoorStarted(now: Date = new Date()): string {
  const existing = readDoorStartedAt();
  if (existing) return existing;
  const iso = now.toISOString();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(V2_ANALYTICS_DOOR_STARTED_KEY, iso);
    } catch {
      /* ignore */
    }
  }
  return iso;
}

export function clearDoorStartedForTests(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(V2_ANALYTICS_DOOR_STARTED_KEY);
  } catch {
    /* ignore */
  }
}
