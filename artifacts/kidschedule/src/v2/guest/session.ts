/**
 * Guest Mode V2 session API (S1-T01).
 * Gated by `guest_mode_v2`. When flag is off, reads return null and writes no-op.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";
import type { FrontDoorAgeBand, FrontDoorWorryId } from "../front-door/types";
import {
  FrontDoorState,
  transitionFrontDoor,
  type FrontDoorEvent,
  type FrontDoorStateId,
} from "../front-door/state-machine";
import {
  clearGuestSessionRaw,
  readGuestSessionRaw,
  writeGuestSessionRaw,
} from "./storage";
import type { V2GuestSession } from "./types";
import { V2_GUEST_SESSION_VERSION } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function createGuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isGuestModeV2Enabled(): boolean {
  return isV2FlagEnabled("guest_mode_v2");
}

export function createEmptyGuestSession(): V2GuestSession {
  const ts = nowIso();
  return {
    version: V2_GUEST_SESSION_VERSION,
    guestId: createGuestId(),
    createdAt: ts,
    updatedAt: ts,
    ageBand: null,
    name: null,
    worry: null,
    state: FrontDoorState.BREATH,
  };
}

/** Load or create guest session when guest_mode_v2 is on. */
export function ensureGuestSession(): V2GuestSession | null {
  if (!isGuestModeV2Enabled()) return null;
  const existing = readGuestSessionRaw();
  if (existing) return existing;
  const created = createEmptyGuestSession();
  writeGuestSessionRaw(created);
  return created;
}

export function getGuestSession(): V2GuestSession | null {
  if (!isGuestModeV2Enabled()) return null;
  return readGuestSessionRaw();
}

export function updateGuestSession(
  patch: Partial<
    Pick<V2GuestSession, "ageBand" | "name" | "worry" | "state">
  >,
): V2GuestSession | null {
  if (!isGuestModeV2Enabled()) return null;
  const current = ensureGuestSession();
  if (!current) return null;
  const next: V2GuestSession = {
    ...current,
    ...patch,
    version: V2_GUEST_SESSION_VERSION,
    updatedAt: nowIso(),
  };
  writeGuestSessionRaw(next);
  return next;
}

/** Apply a state-machine event and optional field patch. */
export function applyFrontDoorEvent(
  event: FrontDoorEvent,
  patch: Partial<Pick<V2GuestSession, "ageBand" | "name" | "worry">> = {},
): V2GuestSession | null {
  if (!isGuestModeV2Enabled()) return null;
  const current = ensureGuestSession();
  if (!current) return null;
  const nextState = transitionFrontDoor(current.state, event);
  return updateGuestSession({ ...patch, state: nextState });
}

/**
 * Semantic setters land on the canonical next state (restore-friendly).
 * UI on the AGE screen also ends on NAME after select.
 */
export function setGuestAgeBand(ageBand: FrontDoorAgeBand): V2GuestSession | null {
  return updateGuestSession({ ageBand, state: FrontDoorState.NAME });
}

export function setGuestChildName(childName: string | null): V2GuestSession | null {
  const trimmed = childName?.trim() ? childName.trim().slice(0, 40) : null;
  return updateGuestSession({ name: trimmed, state: FrontDoorState.WORRY });
}

export function setGuestWorry(worryId: FrontDoorWorryId): V2GuestSession | null {
  return updateGuestSession({
    worry: worryId,
    state: FrontDoorState.COMPLETE,
  });
}

export function advanceFrontDoorFromBreath(): V2GuestSession | null {
  return applyFrontDoorEvent("CONTINUE");
}

export function goBackFrontDoor(): V2GuestSession | null {
  return applyFrontDoorEvent("BACK");
}

export function getFrontDoorState(
  session: V2GuestSession | null,
): FrontDoorStateId {
  return session?.state ?? FrontDoorState.BREATH;
}

/** Rollback helper — clears local guest only. Never touches accounts/entitlements. */
export function clearGuestSession(): void {
  clearGuestSessionRaw();
}
