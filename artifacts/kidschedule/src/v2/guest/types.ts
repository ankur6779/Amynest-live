/**
 * Guest Mode V2 — first-class local session (Sprint 1 · S1-T01).
 * No account required. Soft-save / link is a later sprint.
 */

import type { FrontDoorAgeBand, FrontDoorWorryId } from "../front-door/types";

export type V2GuestSession = {
  /** Stable local guest id (not a Firebase uid). */
  guestId: string;
  createdAt: string;
  updatedAt: string;
  ageBand: FrontDoorAgeBand | null;
  childName: string | null;
  worryId: FrontDoorWorryId | null;
  /** Furthest completed Front Door step id. */
  frontDoorStep: string | null;
  /** True once age + worry captured (Sprint 1 foundation complete). */
  foundationComplete: boolean;
};

export const V2_GUEST_STORAGE_KEY = "amynest.v2.guest.session.v1";
