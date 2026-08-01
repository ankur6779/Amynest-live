/**
 * Front Door V2 types (Sprint 1).
 * Emotional Blueprint age bands — not Parent Hub treasury bands.
 * State machine: see state-machine.ts
 */

export type FrontDoorAgeBand =
  | "infant_0_12m"
  | "toddler_1_2"
  | "preschool_3_5"
  | "child_6_8"
  | "older_9_plus";

/** One worry — chip of truth, not a biography. */
export type FrontDoorWorryId =
  | "speech_talking"
  | "sleep"
  | "behavior"
  | "learning_school"
  | "mornings"
  | "feeding"
  | "something_else";
