/**
 * Amy Memory — durable family facts only.
 * Does not decide attention. Architecture Freeze v1.0 · A1 review.
 */

import type { FrontDoorAgeBand, FrontDoorWorryId } from "@/v2/front-door/types";
import type { FrontDoorStateId } from "@/v2/front-door/state-machine";

/** Bump when persisted document shape changes; migrate in upgrade/migrate. */
export const AMY_MEMORY_SCHEMA_VERSION = 2 as const;

export type AmyMemoryMode = "guest" | "signed_in";

export type AmyCoachMemoryStatus =
  | "none"
  | "prepared"
  | "active"
  | "paused"
  | "completed";

export type AmySpeechMissionMemoryStatus =
  | "unknown"
  | "available"
  | "completed"
  | "unavailable";

/** Provenance for major Memory sections (P0). */
export type AmyMemorySectionMeta = Readonly<{
  source: string;
  updatedAt: string;
  version: number;
}>;

export type AmyMemorySectionId =
  | "child"
  | "challenge"
  | "mission"
  | "coach"
  | "speech";

export type AmyMemoryIdentity = Readonly<{
  mode: AmyMemoryMode;
  guestId: string | null;
  userId: string | null;
}>;

export type AmyMemoryChild = Readonly<{
  childId: string | null;
  displayName: string | null;
  ageBand: FrontDoorAgeBand | null;
  ageMonths: number | null;
  meta: AmyMemorySectionMeta;
}>;

export type AmyMemoryChallenge = Readonly<{
  worryId: FrontDoorWorryId | null;
  label: string | null;
  coachGoalId: string | null;
  meta: AmyMemorySectionMeta;
}>;

export type AmyMemoryFrontDoor = Readonly<{
  state: FrontDoorStateId;
}>;

export type AmyMemoryMission = Readonly<{
  missionId: string | null;
  dateKey: string | null;
  completedAt: string | null;
  /** Guest id that completed (legacy parity). */
  completedForGuestId: string | null;
  meta: AmyMemorySectionMeta;
}>;

export type AmyMemoryPreparedCoach = Readonly<{
  goalId: string;
  goalTitle: string;
  categoryId: string;
  worryId: FrontDoorWorryId;
  challengeLabel: string;
  preparedAt: string;
  gateDismissed: boolean;
}>;

export type AmyMemoryCoach = Readonly<{
  status: AmyCoachMemoryStatus;
  prepared: AmyMemoryPreparedCoach | null;
  sessionId: string | null;
  goalId: string | null;
  goalTitle: string | null;
  /** Stashed discover goal awaiting Amy Coach consume. */
  discoverGoalId: string | null;
  meta: AmyMemorySectionMeta;
}>;

export type AmyMemorySpeech = Readonly<{
  todayMissionStatus: AmySpeechMissionMemoryStatus;
  pronunciationPct: number | null;
  lastPracticeAt: string | null;
  meta: AmyMemorySectionMeta;
}>;

export type AmyMemoryActivity = Readonly<{
  recentSummary: string | null;
  lastActivityAt: string | null;
  hasRoutineSignal: boolean;
}>;

export type AmyMemoryPreferences = Readonly<{
  parentGoals: ReadonlyArray<string>;
  timezone: string | null;
  locale: string | null;
}>;

/** Guest → account merge audit (P0). */
export type AmyMemoryMerge = Readonly<{
  guestId: string | null;
  accountId: string | null;
  mergeVersion: number;
  mergeReason: string | null;
  lastMergedAt: string | null;
}>;

/**
 * Immutable Amy Memory document.
 * Returned snapshots are structurally frozen.
 */
export type AmyMemoryDocument = Readonly<{
  schemaVersion: typeof AMY_MEMORY_SCHEMA_VERSION;
  /** Fingerprint of meaningful facts — for Context / Stability later. */
  contextVersion: string;
  createdAt: string;
  updatedAt: string;
  /** True when this document was created/upgraded via legacy migration. */
  migrationApplied: boolean;
  identity: AmyMemoryIdentity;
  child: AmyMemoryChild;
  challenge: AmyMemoryChallenge;
  frontDoor: AmyMemoryFrontDoor;
  mission: AmyMemoryMission;
  coach: AmyMemoryCoach;
  speech: AmyMemorySpeech;
  activity: AmyMemoryActivity;
  preferences: AmyMemoryPreferences;
  merge: AmyMemoryMerge;
}>;

export type AmyMemorySectionMetaMutable = {
  source: string;
  updatedAt: string;
  version: number;
};

/** Internal mutable document — never exported as API return type. */
export type AmyMemoryMutable = {
  schemaVersion: typeof AMY_MEMORY_SCHEMA_VERSION;
  contextVersion: string;
  createdAt: string;
  updatedAt: string;
  migrationApplied: boolean;
  identity: {
    mode: AmyMemoryMode;
    guestId: string | null;
    userId: string | null;
  };
  child: {
    childId: string | null;
    displayName: string | null;
    ageBand: FrontDoorAgeBand | null;
    ageMonths: number | null;
    meta: AmyMemorySectionMetaMutable;
  };
  challenge: {
    worryId: FrontDoorWorryId | null;
    label: string | null;
    coachGoalId: string | null;
    meta: AmyMemorySectionMetaMutable;
  };
  frontDoor: {
    state: FrontDoorStateId;
  };
  mission: {
    missionId: string | null;
    dateKey: string | null;
    completedAt: string | null;
    completedForGuestId: string | null;
    meta: AmyMemorySectionMetaMutable;
  };
  coach: {
    status: AmyCoachMemoryStatus;
    prepared: AmyMemoryPreparedCoach | null;
    sessionId: string | null;
    goalId: string | null;
    goalTitle: string | null;
    discoverGoalId: string | null;
    meta: AmyMemorySectionMetaMutable;
  };
  speech: {
    todayMissionStatus: AmySpeechMissionMemoryStatus;
    pronunciationPct: number | null;
    lastPracticeAt: string | null;
    meta: AmyMemorySectionMetaMutable;
  };
  activity: {
    recentSummary: string | null;
    lastActivityAt: string | null;
    hasRoutineSignal: boolean;
  };
  preferences: {
    parentGoals: string[];
    timezone: string | null;
    locale: string | null;
  };
  merge: {
    guestId: string | null;
    accountId: string | null;
    mergeVersion: number;
    mergeReason: string | null;
    lastMergedAt: string | null;
  };
};

export type AmyMemorySectionPatch<T> = Partial<Omit<T, "meta">>;

export type AmyMemoryPatch = {
  identity?: Partial<AmyMemoryIdentity>;
  child?: AmyMemorySectionPatch<AmyMemoryChild>;
  challenge?: AmyMemorySectionPatch<AmyMemoryChallenge>;
  frontDoor?: Partial<AmyMemoryFrontDoor>;
  mission?: AmyMemorySectionPatch<AmyMemoryMission>;
  coach?: AmyMemorySectionPatch<AmyMemoryCoach>;
  speech?: AmyMemorySectionPatch<AmyMemorySpeech>;
  activity?: Partial<AmyMemoryActivity>;
  preferences?: Partial<{
    parentGoals: readonly string[];
    timezone: string | null;
    locale: string | null;
  }>;
  merge?: Partial<AmyMemoryMerge>;
  migrationApplied?: boolean;
};

export type AmyMemoryWriteOptions = {
  adapter?: AmyMemoryStorageAdapterRef;
  /**
   * Write source stamped onto every major section present in the patch.
   * Adapters must pass a stable source id (e.g. guest_bridge).
   */
  source?: string;
  /** Per-section source override. */
  sectionSources?: Partial<Record<AmyMemorySectionId, string>>;
};

/** Avoid circular import — adapter type narrowed in api. */
export type AmyMemoryStorageAdapterRef = {
  readRaw(): AmyMemoryMutable | null;
  writeRaw(doc: AmyMemoryMutable): void;
  clearRaw(): void;
};

/** Developer-only health (P1) — no production UI. */
export type AmyMemoryHealth = Readonly<{
  schemaVersion: number | null;
  contextVersion: string | null;
  migrationApplied: boolean;
  legacyKeysRemaining: readonly string[];
  lastUpdated: string | null;
}>;
