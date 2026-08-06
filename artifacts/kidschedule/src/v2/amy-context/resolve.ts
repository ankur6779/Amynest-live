/**
 * resolveAmyContext — pure, deterministic, side-effect free.
 * Input: Amy Memory only. Output: AmyContext.
 * Never writes Memory. Never decides attention.
 */

import type { AmyMemoryDocument } from "@/v2/amy-memory";
import { freezeDeep } from "./freeze";
import {
  AMY_CONTEXT_POLICY_COMPATIBILITY,
  AMY_CONTEXT_RESOLVER_VERSION,
  type AmyContext,
  type ResolveAmyContextOptions,
} from "./types";

function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hasCompletedMissionToday(
  memory: AmyMemoryDocument,
  now: Date,
): boolean {
  if (!memory.mission.missionId || !memory.mission.completedAt) return false;
  if (!memory.mission.dateKey) return false;
  return memory.mission.dateKey === localDateKey(now);
}

/**
 * Resolve Amy Memory → AmyContext.
 * Pure function: same memory + same options ⇒ same context.
 */
export function resolveAmyContext(
  memory: AmyMemoryDocument,
  options: ResolveAmyContextOptions = {},
): AmyContext {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();

  const isSignedIn = memory.identity.mode === "signed_in";
  const isGuest = !isSignedIn;
  const hasPreparedPlan =
    memory.coach.status === "prepared" && memory.coach.prepared != null;
  const hasCoachJourney =
    memory.coach.status === "active" ||
    memory.coach.status === "paused" ||
    memory.coach.status === "completed" ||
    hasPreparedPlan ||
    Boolean(memory.coach.sessionId);
  const hasSpeechConcern = memory.challenge.worryId === "speech_talking";
  const missionDoneToday = hasCompletedMissionToday(memory, now);

  // Premium facts are not yet stored in Memory — resolve as false (facts only).
  const premiumEligible = false;
  const premiumUnlocked = false;

  const ctx: AmyContext = {
    meta: {
      contextVersion: memory.contextVersion,
      generatedAt,
      memoryVersion: memory.schemaVersion,
      policyCompatibility: [...AMY_CONTEXT_POLICY_COMPATIBILITY],
      resolverVersion: AMY_CONTEXT_RESOLVER_VERSION,
    },
    identity: {
      mode: memory.identity.mode,
      guestId: memory.identity.guestId,
      userId: memory.identity.userId,
    },
    child: {
      childId: memory.child.childId,
      displayName: memory.child.displayName,
      ageBand: memory.child.ageBand,
      ageMonths: memory.child.ageMonths,
      sourceMeta: memory.child.meta,
    },
    challenge: {
      worryId: memory.challenge.worryId,
      label: memory.challenge.label,
      coachGoalId: memory.challenge.coachGoalId,
      sourceMeta: memory.challenge.meta,
    },
    mission: {
      missionId: memory.mission.missionId,
      dateKey: memory.mission.dateKey,
      completedAt: memory.mission.completedAt,
      completedForGuestId: memory.mission.completedForGuestId,
      frontDoorState: memory.frontDoor.state,
      sourceMeta: memory.mission.meta,
    },
    coach: {
      status: memory.coach.status,
      sessionId: memory.coach.sessionId,
      goalId: memory.coach.goalId,
      goalTitle: memory.coach.goalTitle,
      discoverGoalId: memory.coach.discoverGoalId,
      prepared: memory.coach.prepared
        ? {
            goalId: memory.coach.prepared.goalId,
            goalTitle: memory.coach.prepared.goalTitle,
            categoryId: memory.coach.prepared.categoryId,
            worryId: memory.coach.prepared.worryId,
            challengeLabel: memory.coach.prepared.challengeLabel,
            preparedAt: memory.coach.prepared.preparedAt,
            gateDismissed: memory.coach.prepared.gateDismissed,
          }
        : null,
      sourceMeta: memory.coach.meta,
    },
    speech: {
      todayMissionStatus: memory.speech.todayMissionStatus,
      pronunciationPct: memory.speech.pronunciationPct,
      lastPracticeAt: memory.speech.lastPracticeAt,
      sourceMeta: memory.speech.meta,
    },
    activity: {
      recentSummary: memory.activity.recentSummary,
      lastActivityAt: memory.activity.lastActivityAt,
      hasRoutineSignal: memory.activity.hasRoutineSignal,
    },
    preferences: {
      parentGoals: [...memory.preferences.parentGoals],
      timezone: memory.preferences.timezone,
      locale: memory.preferences.locale,
    },
    journey: {
      coachStatus: memory.coach.status,
      sessionId: memory.coach.sessionId,
      goalId: memory.coach.goalId,
      preparedGoalId: memory.coach.prepared?.goalId ?? null,
      preparedGateDismissed: memory.coach.prepared
        ? memory.coach.prepared.gateDismissed
        : null,
      discoverGoalId: memory.coach.discoverGoalId,
    },
    capabilities: {
      isGuest,
      isSignedIn,
      hasCoachJourney,
      hasSpeechConcern,
      hasCompletedMissionToday: missionDoneToday,
      hasPreparedPlan,
      premiumEligible,
      premiumUnlocked,
    },
    memory: {
      schemaVersion: memory.schemaVersion,
      memoryContextVersion: memory.contextVersion,
      memoryUpdatedAt: memory.updatedAt,
      memoryCreatedAt: memory.createdAt,
      migrationApplied: memory.migrationApplied,
      merge: {
        guestId: memory.merge.guestId,
        accountId: memory.merge.accountId,
        mergeVersion: memory.merge.mergeVersion,
        mergeReason: memory.merge.mergeReason,
        lastMergedAt: memory.merge.lastMergedAt,
      },
    },
  };

  return freezeDeep(ctx);
}
