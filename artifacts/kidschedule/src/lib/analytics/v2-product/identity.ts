/**
 * anonymousId continuity — guestId preferred; stable local fallback.
 * accountId is optional overlay; never replaces anonymousId.
 */

import { getGuestSession } from "@/v2/guest";
import { V2_ANALYTICS_ANON_KEY, V2_ANALYTICS_SESSION_KEY } from "./storage-keys";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readLs(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLs(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readSs(key: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSs(key: string, value: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve anonymousId with guest continuity.
 * Prefer guestId when Guest Mode V2 session exists.
 */
export function resolveAnonymousId(guestId?: string | null): string {
  const fromGuest = guestId?.trim() || getGuestSession()?.guestId?.trim();
  if (fromGuest) {
    // Keep a mirror so account sessions without guest still stitch later.
    writeLs(V2_ANALYTICS_ANON_KEY, fromGuest);
    return fromGuest;
  }
  const existing = readLs(V2_ANALYTICS_ANON_KEY);
  if (existing?.trim()) return existing.trim();
  const created = createId("anon");
  writeLs(V2_ANALYTICS_ANON_KEY, created);
  return created;
}

/** Tab/session id — survives refresh within the same tab; new on cold restart. */
export function resolveSessionId(): string {
  const existing = readSs(V2_ANALYTICS_SESSION_KEY);
  if (existing?.trim()) return existing.trim();
  const created = createId("sess");
  writeSs(V2_ANALYTICS_SESSION_KEY, created);
  return created;
}

export function clearProductAnalyticsIdentityForTests(): void {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(V2_ANALYTICS_ANON_KEY);
    } catch {
      /* ignore */
    }
  }
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(V2_ANALYTICS_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}
