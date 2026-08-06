/**
 * One-shot migration from pre-Memory local keys into Amy Memory.
 * After migration, legacy keys are removed so Memory remains the only SoT.
 */

import {
  FrontDoorState,
  isFrontDoorState,
  resumeFrontDoorState,
} from "@/v2/front-door/state-machine";
import type { FrontDoorAgeBand, FrontDoorWorryId } from "@/v2/front-door/types";
import { createEmptyAmyMemory } from "./empty";
import {
  LEGACY_COACH_DISCOVER_GOAL_KEY,
  LEGACY_COACH_PREPARED_PLAN_KEY,
  LEGACY_GUEST_SESSION_KEY,
  LEGACY_GUEST_SESSION_KEY_V1,
  LEGACY_MISSION_COMPLETION_KEY,
  LEGACY_SOFT_SAVE_CLAIM_KEY,
} from "./keys";
import { createSectionMeta } from "./section-meta";
import type { AmyMemoryMutable, AmyMemoryPreparedCoach } from "./types";

function readLs(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeLs(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
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

function removeSs(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

const LEGACY_KEY_LIST = [
  LEGACY_GUEST_SESSION_KEY,
  LEGACY_GUEST_SESSION_KEY_V1,
  LEGACY_MISSION_COMPLETION_KEY,
  LEGACY_COACH_PREPARED_PLAN_KEY,
  LEGACY_SOFT_SAVE_CLAIM_KEY,
] as const;

/** Developer health: which legacy keys still exist. */
export function listLegacyKeysRemaining(): string[] {
  const remaining: string[] = [];
  for (const key of LEGACY_KEY_LIST) {
    if (readLs(key)) remaining.push(key);
  }
  if (readSs(LEGACY_COACH_DISCOVER_GOAL_KEY)) {
    remaining.push(LEGACY_COACH_DISCOVER_GOAL_KEY);
  }
  return remaining;
}

/** Build memory from legacy stores if any exist. */
export function migrateLegacyIntoMemory(): AmyMemoryMutable | null {
  const guestRaw =
    parseJson(readLs(LEGACY_GUEST_SESSION_KEY)) ??
    parseJson(readLs(LEGACY_GUEST_SESSION_KEY_V1));
  const missionRaw = parseJson(readLs(LEGACY_MISSION_COMPLETION_KEY));
  const preparedRaw = parseJson(readLs(LEGACY_COACH_PREPARED_PLAN_KEY));
  const claimRaw = parseJson(readLs(LEGACY_SOFT_SAVE_CLAIM_KEY));
  const discoverGoal = readSs(LEGACY_COACH_DISCOVER_GOAL_KEY);

  const hasLegacy = Boolean(
    guestRaw || missionRaw || preparedRaw || claimRaw || discoverGoal,
  );
  if (!hasLegacy) return null;

  const at = new Date().toISOString();
  const draft = createEmptyAmyMemory({ source: "legacy_migration" });
  draft.migrationApplied = true;

  if (guestRaw && typeof guestRaw === "object") {
    const g = guestRaw as Record<string, unknown>;
    if (typeof g.guestId === "string") {
      draft.identity.guestId = g.guestId;
      draft.identity.mode = "guest";
    }
    if (typeof g.createdAt === "string") draft.createdAt = g.createdAt;
    if (typeof g.updatedAt === "string") draft.updatedAt = g.updatedAt;

    const name =
      typeof g.name === "string"
        ? g.name
        : typeof g.childName === "string"
          ? g.childName
          : null;
    draft.child.displayName = name;
    draft.child.ageBand = (g.ageBand as FrontDoorAgeBand | null) ?? null;
    draft.child.meta = createSectionMeta("legacy_migration.guest", at, 1);

    const worry = (
      typeof g.worry === "string"
        ? g.worry
        : typeof g.worryId === "string"
          ? g.worryId
          : null
    ) as FrontDoorWorryId | null;
    draft.challenge.worryId = worry;
    draft.challenge.meta = createSectionMeta("legacy_migration.guest", at, 1);

    if (isFrontDoorState(g.state)) {
      draft.frontDoor.state = g.state;
    } else if (g.foundationComplete || worry) {
      draft.frontDoor.state = FrontDoorState.COMPLETE;
    } else {
      draft.frontDoor.state = resumeFrontDoorState({
        ageBand: draft.child.ageBand,
        worry,
        state: null,
      });
    }
  }

  if (claimRaw && typeof claimRaw === "object") {
    const c = claimRaw as Record<string, unknown>;
    if (typeof c.guestId === "string") {
      draft.merge.guestId = c.guestId;
      draft.merge.lastMergedAt =
        typeof c.claimedAt === "string" ? c.claimedAt : at;
      draft.merge.mergeVersion = 1;
      draft.merge.mergeReason = "legacy_soft_save_claim";
    }
    if (!draft.child.displayName && typeof c.name === "string") {
      draft.child.displayName = c.name;
      draft.child.meta = createSectionMeta("legacy_migration.claim", at, 1);
    }
    if (!draft.child.ageBand && c.ageBand != null) {
      draft.child.ageBand = c.ageBand as FrontDoorAgeBand;
      draft.child.meta = createSectionMeta("legacy_migration.claim", at, 1);
    }
    if (!draft.challenge.worryId && typeof c.worry === "string") {
      draft.challenge.worryId = c.worry as FrontDoorWorryId;
      draft.challenge.meta = createSectionMeta("legacy_migration.claim", at, 1);
    }
  }

  if (missionRaw && typeof missionRaw === "object") {
    const m = missionRaw as Record<string, unknown>;
    if (
      typeof m.missionId === "string" &&
      typeof m.dateKey === "string" &&
      typeof m.completedAt === "string"
    ) {
      draft.mission.missionId = m.missionId;
      draft.mission.dateKey = m.dateKey;
      draft.mission.completedAt = m.completedAt;
      draft.mission.completedForGuestId =
        typeof m.guestId === "string" ? m.guestId : draft.identity.guestId;
      draft.mission.meta = createSectionMeta("legacy_migration.mission", at, 1);
      draft.speech.todayMissionStatus = "completed";
      draft.speech.lastPracticeAt = m.completedAt;
      draft.speech.meta = createSectionMeta("legacy_migration.mission", at, 1);
    }
  }

  if (preparedRaw && typeof preparedRaw === "object") {
    const p = preparedRaw as Record<string, unknown>;
    if (typeof p.goalId === "string" && typeof p.goalTitle === "string") {
      const prepared: AmyMemoryPreparedCoach = {
        goalId: p.goalId,
        goalTitle: p.goalTitle,
        categoryId: typeof p.categoryId === "string" ? p.categoryId : "",
        worryId: (p.worryId as FrontDoorWorryId) ?? "behavior",
        challengeLabel:
          typeof p.challengeLabel === "string" ? p.challengeLabel : p.goalTitle,
        preparedAt:
          typeof p.preparedAt === "string"
            ? p.preparedAt
            : new Date().toISOString(),
        gateDismissed: Boolean(p.gateDismissed),
      };
      draft.coach.prepared = prepared;
      draft.coach.status = "prepared";
      draft.coach.goalId = prepared.goalId;
      draft.coach.goalTitle = prepared.goalTitle;
      draft.coach.meta = createSectionMeta("legacy_migration.coach", at, 1);
      draft.challenge.coachGoalId = prepared.goalId;
      if (!draft.challenge.label) {
        draft.challenge.label = prepared.challengeLabel;
      }
      draft.challenge.meta = createSectionMeta("legacy_migration.coach", at, 1);
    }
  }

  if (typeof discoverGoal === "string" && discoverGoal.length > 0) {
    draft.coach.discoverGoalId = discoverGoal;
    draft.coach.meta = createSectionMeta("legacy_migration.coach", at, 1);
  }

  clearLegacyKeys();
  return draft;
}

export function clearLegacyKeys(): void {
  removeLs(LEGACY_GUEST_SESSION_KEY);
  removeLs(LEGACY_GUEST_SESSION_KEY_V1);
  removeLs(LEGACY_MISSION_COMPLETION_KEY);
  removeLs(LEGACY_COACH_PREPARED_PLAN_KEY);
  removeLs(LEGACY_SOFT_SAVE_CLAIM_KEY);
  removeSs(LEGACY_COACH_DISCOVER_GOAL_KEY);
}
