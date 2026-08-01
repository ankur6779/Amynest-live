/**
 * Guest Mode V2 — versioned local session (Sprint 1 · S1-T01 + review P0).
 * Schema version enables future migrations without silent breakage.
 */

import type { FrontDoorAgeBand, FrontDoorWorryId } from "../front-door/types";
import type { FrontDoorStateId } from "../front-door/state-machine";

/** Bump when persisted shape changes; migrate in storage.ts. */
export const V2_GUEST_SESSION_VERSION = 1 as const;

export type V2GuestSession = {
  version: typeof V2_GUEST_SESSION_VERSION;
  /** Stable local guest id (not a Firebase uid). */
  guestId: string;
  createdAt: string;
  updatedAt: string;
  ageBand: FrontDoorAgeBand | null;
  /** Child name — optional gift (persisted key: name). */
  name: string | null;
  /** One worry id (persisted key: worry). */
  worry: FrontDoorWorryId | null;
  /** Explicit Front Door state machine cursor. */
  state: FrontDoorStateId;
};

export const V2_GUEST_STORAGE_KEY = "amynest.v2.guest.session";
