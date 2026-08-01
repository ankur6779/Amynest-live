import type { V2GuestSession } from "./types";
import { V2_GUEST_STORAGE_KEY } from "./types";

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function readGuestSessionRaw(): V2GuestSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(V2_GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as V2GuestSession;
    if (!parsed || typeof parsed.guestId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestSessionRaw(session: V2GuestSession): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(V2_GUEST_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota / private mode — guest still works in-memory for the session.
  }
}

export function clearGuestSessionRaw(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(V2_GUEST_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
