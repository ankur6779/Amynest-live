import { FrontDoorState } from "@/v2/front-door/state-machine";
import { computeContextVersion } from "./context-version";
import { createSectionMeta } from "./section-meta";
import {
  AMY_MEMORY_SCHEMA_VERSION,
  type AmyMemoryDocument,
  type AmyMemoryMutable,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function createGuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyAmyMemory(args?: {
  guestId?: string;
  mode?: "guest" | "signed_in";
  userId?: string | null;
  source?: string;
}): AmyMemoryMutable {
  const ts = nowIso();
  const mode = args?.mode ?? "guest";
  const source = args?.source ?? "amy_memory.init";
  const meta = () => createSectionMeta(source, ts, 1);
  const draft: AmyMemoryMutable = {
    schemaVersion: AMY_MEMORY_SCHEMA_VERSION,
    contextVersion: "",
    createdAt: ts,
    updatedAt: ts,
    migrationApplied: false,
    identity: {
      mode,
      guestId:
        mode === "guest" ? (args?.guestId ?? createGuestId()) : (args?.guestId ?? null),
      userId: args?.userId ?? null,
    },
    child: {
      childId: null,
      displayName: null,
      ageBand: null,
      ageMonths: null,
      meta: meta(),
    },
    challenge: {
      worryId: null,
      label: null,
      coachGoalId: null,
      meta: meta(),
    },
    frontDoor: {
      state: FrontDoorState.BREATH,
    },
    mission: {
      missionId: null,
      dateKey: null,
      completedAt: null,
      completedForGuestId: null,
      meta: meta(),
    },
    coach: {
      status: "none",
      prepared: null,
      sessionId: null,
      goalId: null,
      goalTitle: null,
      discoverGoalId: null,
      meta: meta(),
    },
    speech: {
      todayMissionStatus: "unknown",
      pronunciationPct: null,
      lastPracticeAt: null,
      meta: meta(),
    },
    activity: {
      recentSummary: null,
      lastActivityAt: null,
      hasRoutineSignal: false,
    },
    preferences: {
      parentGoals: [],
      timezone: null,
      locale: null,
    },
    merge: {
      guestId: null,
      accountId: null,
      mergeVersion: 0,
      mergeReason: null,
      lastMergedAt: null,
    },
  };
  draft.contextVersion = computeContextVersion(draft as AmyMemoryDocument);
  return draft;
}
