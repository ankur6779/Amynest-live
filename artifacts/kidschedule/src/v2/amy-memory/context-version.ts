import type { AmyMemoryDocument } from "./types";

/**
 * Stable fingerprint of meaningful family facts.
 * Harmless UI/nav changes must not alter this.
 */
export function computeContextVersion(
  doc: Pick<
    AmyMemoryDocument,
    | "identity"
    | "child"
    | "challenge"
    | "frontDoor"
    | "mission"
    | "coach"
    | "speech"
    | "activity"
    | "preferences"
  >,
): string {
  const payload = {
    mode: doc.identity.mode,
    guestId: doc.identity.guestId,
    userId: doc.identity.userId,
    childId: doc.child.childId,
    name: doc.child.displayName,
    ageBand: doc.child.ageBand,
    ageMonths: doc.child.ageMonths,
    worryId: doc.challenge.worryId,
    coachGoalId: doc.challenge.coachGoalId,
    frontDoor: doc.frontDoor.state,
    missionId: doc.mission.missionId,
    missionDate: doc.mission.dateKey,
    missionDoneAt: doc.mission.completedAt,
    coachStatus: doc.coach.status,
    coachSession: doc.coach.sessionId,
    coachGoal: doc.coach.goalId,
    preparedGoal: doc.coach.prepared?.goalId ?? null,
    preparedDismissed: doc.coach.prepared?.gateDismissed ?? null,
    discoverGoal: doc.coach.discoverGoalId,
    speechStatus: doc.speech.todayMissionStatus,
    speechPct: doc.speech.pronunciationPct,
    activityAt: doc.activity.lastActivityAt,
    hasRoutine: doc.activity.hasRoutineSignal,
    parentGoals: doc.preferences.parentGoals,
    timezone: doc.preferences.timezone,
  };
  return `ctx_v1_${fnv1a(JSON.stringify(payload))}`;
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
