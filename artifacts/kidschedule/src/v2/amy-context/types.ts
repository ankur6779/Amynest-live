/**
 * Amy Context — resolved family facts for the Amy OS.
 * Read-only. No decisions. No UI. Architecture Freeze v1.0 · Sprint A2.
 */

import type {
  AmyCoachMemoryStatus,
  AmyMemoryMerge,
  AmyMemorySectionMeta,
  AmySpeechMissionMemoryStatus,
} from "@/v2/amy-memory";
import type { FrontDoorAgeBand, FrontDoorWorryId } from "@/v2/front-door/types";
import type { FrontDoorStateId } from "@/v2/front-door/state-machine";

/** Bump when AmyContext shape changes. */
export const AMY_CONTEXT_RESOLVER_VERSION = "amy_context.v1" as const;

/** Decision / policy shapes this Context is safe to feed. */
export const AMY_CONTEXT_POLICY_COMPATIBILITY = [
  "amy_decision.v1",
  "mvp_speech_wedge.v1",
] as const;

export type AmyContextIdentity = Readonly<{
  mode: "guest" | "signed_in";
  guestId: string | null;
  userId: string | null;
}>;

export type AmyContextChild = Readonly<{
  childId: string | null;
  displayName: string | null;
  ageBand: FrontDoorAgeBand | null;
  ageMonths: number | null;
  sourceMeta: AmyMemorySectionMeta;
}>;

export type AmyContextChallenge = Readonly<{
  worryId: FrontDoorWorryId | null;
  label: string | null;
  coachGoalId: string | null;
  sourceMeta: AmyMemorySectionMeta;
}>;

export type AmyContextMission = Readonly<{
  missionId: string | null;
  dateKey: string | null;
  completedAt: string | null;
  completedForGuestId: string | null;
  frontDoorState: FrontDoorStateId;
  sourceMeta: AmyMemorySectionMeta;
}>;

export type AmyContextCoach = Readonly<{
  status: AmyCoachMemoryStatus;
  sessionId: string | null;
  goalId: string | null;
  goalTitle: string | null;
  discoverGoalId: string | null;
  prepared: Readonly<{
    goalId: string;
    goalTitle: string;
    categoryId: string;
    worryId: FrontDoorWorryId;
    challengeLabel: string;
    preparedAt: string;
    gateDismissed: boolean;
  }> | null;
  sourceMeta: AmyMemorySectionMeta;
}>;

export type AmyContextSpeech = Readonly<{
  todayMissionStatus: AmySpeechMissionMemoryStatus;
  pronunciationPct: number | null;
  lastPracticeAt: string | null;
  sourceMeta: AmyMemorySectionMeta;
}>;

export type AmyContextActivity = Readonly<{
  recentSummary: string | null;
  lastActivityAt: string | null;
  hasRoutineSignal: boolean;
}>;

export type AmyContextPreferences = Readonly<{
  parentGoals: ReadonlyArray<string>;
  timezone: string | null;
  locale: string | null;
}>;

/** Journey facts only — not Hero / attention decisions. */
export type AmyContextJourney = Readonly<{
  coachStatus: AmyCoachMemoryStatus;
  sessionId: string | null;
  goalId: string | null;
  preparedGoalId: string | null;
  preparedGateDismissed: boolean | null;
  discoverGoalId: string | null;
}>;

/**
 * Resolved boolean facts from Memory only.
 * Not visibility, not Hero, not UI.
 */
export type AmyContextCapabilities = Readonly<{
  isGuest: boolean;
  isSignedIn: boolean;
  hasCoachJourney: boolean;
  hasSpeechConcern: boolean;
  hasCompletedMissionToday: boolean;
  hasPreparedPlan: boolean;
  /** From Memory only — false when Memory has no premium facts yet. */
  premiumEligible: boolean;
  premiumUnlocked: boolean;
}>;

export type AmyContextMemoryMetadata = Readonly<{
  schemaVersion: number;
  memoryContextVersion: string;
  memoryUpdatedAt: string;
  memoryCreatedAt: string;
  migrationApplied: boolean;
  /** Audit trail only — not used for capability resolution. */
  merge: AmyMemoryMerge;
}>;

export type AmyContextMeta = Readonly<{
  contextVersion: string;
  generatedAt: string;
  memoryVersion: number;
  policyCompatibility: ReadonlyArray<string>;
  resolverVersion: typeof AMY_CONTEXT_RESOLVER_VERSION;
}>;

/**
 * Canonical Amy Context — single immutable object.
 * Contains zero business decisions and zero UI knowledge.
 */
export type AmyContext = Readonly<{
  meta: AmyContextMeta;
  identity: AmyContextIdentity;
  child: AmyContextChild;
  challenge: AmyContextChallenge;
  mission: AmyContextMission;
  coach: AmyContextCoach;
  speech: AmyContextSpeech;
  activity: AmyContextActivity;
  preferences: AmyContextPreferences;
  journey: AmyContextJourney;
  capabilities: AmyContextCapabilities;
  memory: AmyContextMemoryMetadata;
}>;

export type ResolveAmyContextOptions = Readonly<{
  /** Injected clock for deterministic mission-day resolution. */
  now?: Date;
}>;

export type AmyContextValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type AmyContextValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<AmyContextValidationIssue>;
}>;

export type AmyContextDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;
