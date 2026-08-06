/**
 * Cohort day-0 for D1 / Practice Day-3 North Stars.
 * No child PII.
 */

import { getGuestSession } from "@/v2/guest";
import { localDateKey } from "./dates";
import { V2_ANALYTICS_COHORT_DAY0_KEY } from "./storage-keys";

export function readCohortDay0(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(V2_ANALYTICS_COHORT_DAY0_KEY);
  } catch {
    return null;
  }
}

/** Ensure cohort_day0 exists — guest createdAt date preferred. */
export function ensureCohortDay0(now: Date = new Date()): string {
  const existing = readCohortDay0();
  if (existing) return existing;

  const guest = getGuestSession();
  let day0 = localDateKey(now);
  if (guest?.createdAt) {
    const created = new Date(guest.createdAt);
    if (!Number.isNaN(created.getTime())) {
      day0 = localDateKey(created);
    }
  }

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(V2_ANALYTICS_COHORT_DAY0_KEY, day0);
    } catch {
      /* ignore */
    }
  }
  return day0;
}

export function clearCohortDay0ForTests(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(V2_ANALYTICS_COHORT_DAY0_KEY);
  } catch {
    /* ignore */
  }
}
