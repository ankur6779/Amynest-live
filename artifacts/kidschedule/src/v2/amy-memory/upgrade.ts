/**
 * In-document schema upgrades (v1 → v2).
 */

import { createSectionMeta } from "./section-meta";
import {
  AMY_MEMORY_SCHEMA_VERSION,
  type AmyMemoryMutable,
  type AmyMemorySectionMetaMutable,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function ensureMeta(
  raw: unknown,
  source: string,
  at: string,
): AmyMemorySectionMetaMutable {
  if (raw && typeof raw === "object") {
    const m = raw as Partial<AmyMemorySectionMetaMutable>;
    if (typeof m.source === "string" && typeof m.updatedAt === "string") {
      return {
        source: m.source,
        updatedAt: m.updatedAt,
        version: typeof m.version === "number" ? m.version : 1,
      };
    }
  }
  return createSectionMeta(source, at, 1);
}

/** Upgrade any older persisted blob to schema v2 mutable shape. */
export function upgradeMemoryDocument(raw: unknown): AmyMemoryMutable | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  const schemaVersion = doc.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2) return null;
  if (typeof doc.contextVersion !== "string") return null;
  if (typeof doc.createdAt !== "string" || typeof doc.updatedAt !== "string") {
    return null;
  }
  if (!doc.identity || !doc.child || !doc.challenge || !doc.mission || !doc.coach) {
    return null;
  }

  const at = nowIso();
  const identity = doc.identity as AmyMemoryMutable["identity"];
  const child = doc.child as Record<string, unknown>;
  const challenge = doc.challenge as Record<string, unknown>;
  const mission = doc.mission as Record<string, unknown>;
  const coach = doc.coach as Record<string, unknown>;
  const speech = (doc.speech ?? {}) as Record<string, unknown>;
  const activity = (doc.activity ?? {}) as AmyMemoryMutable["activity"];
  const preferences = (doc.preferences ?? {
    parentGoals: [],
    timezone: null,
    locale: null,
  }) as AmyMemoryMutable["preferences"];
  const frontDoor = (doc.frontDoor ?? { state: "BREATH" }) as AmyMemoryMutable["frontDoor"];
  const mergeRaw = (doc.merge ?? {}) as Record<string, unknown>;

  const merge: AmyMemoryMutable["merge"] = {
    guestId:
      typeof mergeRaw.guestId === "string"
        ? mergeRaw.guestId
        : typeof mergeRaw.lastMergedGuestId === "string"
          ? mergeRaw.lastMergedGuestId
          : null,
    accountId:
      typeof mergeRaw.accountId === "string"
        ? mergeRaw.accountId
        : typeof identity.userId === "string"
          ? identity.userId
          : null,
    mergeVersion:
      typeof mergeRaw.mergeVersion === "number" ? mergeRaw.mergeVersion : 0,
    mergeReason:
      typeof mergeRaw.mergeReason === "string" ? mergeRaw.mergeReason : null,
    lastMergedAt:
      typeof mergeRaw.lastMergedAt === "string" ? mergeRaw.lastMergedAt : null,
  };

  const upgraded: AmyMemoryMutable = {
    schemaVersion: AMY_MEMORY_SCHEMA_VERSION,
    contextVersion: doc.contextVersion as string,
    createdAt: doc.createdAt as string,
    updatedAt: doc.updatedAt as string,
    migrationApplied: Boolean(doc.migrationApplied),
    identity: {
      mode: identity.mode === "signed_in" ? "signed_in" : "guest",
      guestId: identity.guestId ?? null,
      userId: identity.userId ?? null,
    },
    child: {
      childId: (child.childId as string | null) ?? null,
      displayName: (child.displayName as string | null) ?? null,
      ageBand: (child.ageBand as AmyMemoryMutable["child"]["ageBand"]) ?? null,
      ageMonths: (child.ageMonths as number | null) ?? null,
      meta: ensureMeta(child.meta, "upgrade.v2", at),
    },
    challenge: {
      worryId: (challenge.worryId as AmyMemoryMutable["challenge"]["worryId"]) ?? null,
      label: (challenge.label as string | null) ?? null,
      coachGoalId: (challenge.coachGoalId as string | null) ?? null,
      meta: ensureMeta(challenge.meta, "upgrade.v2", at),
    },
    frontDoor,
    mission: {
      missionId: (mission.missionId as string | null) ?? null,
      dateKey: (mission.dateKey as string | null) ?? null,
      completedAt: (mission.completedAt as string | null) ?? null,
      completedForGuestId: (mission.completedForGuestId as string | null) ?? null,
      meta: ensureMeta(mission.meta, "upgrade.v2", at),
    },
    coach: {
      status: (coach.status as AmyMemoryMutable["coach"]["status"]) ?? "none",
      prepared: (coach.prepared as AmyMemoryMutable["coach"]["prepared"]) ?? null,
      sessionId: (coach.sessionId as string | null) ?? null,
      goalId: (coach.goalId as string | null) ?? null,
      goalTitle: (coach.goalTitle as string | null) ?? null,
      discoverGoalId: (coach.discoverGoalId as string | null) ?? null,
      meta: ensureMeta(coach.meta, "upgrade.v2", at),
    },
    speech: {
      todayMissionStatus:
        (speech.todayMissionStatus as AmyMemoryMutable["speech"]["todayMissionStatus"]) ??
        "unknown",
      pronunciationPct: (speech.pronunciationPct as number | null) ?? null,
      lastPracticeAt: (speech.lastPracticeAt as string | null) ?? null,
      meta: ensureMeta(speech.meta, "upgrade.v2", at),
    },
    activity: {
      recentSummary: activity.recentSummary ?? null,
      lastActivityAt: activity.lastActivityAt ?? null,
      hasRoutineSignal: Boolean(activity.hasRoutineSignal),
    },
    preferences: {
      parentGoals: Array.isArray(preferences.parentGoals)
        ? [...preferences.parentGoals]
        : [],
      timezone: preferences.timezone ?? null,
      locale: preferences.locale ?? null,
    },
    merge,
  };

  return upgraded;
}
