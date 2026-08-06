/**
 * Guest Coach plan preparation — local continuity via Amy Memory.
 * Must not write localStorage directly (P0 write ownership).
 */

import {
  ensureAmyMemory,
  readAmyMemory,
  updateAmyMemory,
  type AmyMemoryPreparedCoach,
} from "@/v2/amy-memory";
import type { FrontDoorWorryId } from "@/v2/front-door/types";

/** @deprecated Legacy key — migrated into Amy Memory. */
export const V2_COACH_PREPARED_PLAN_KEY = "amynest.v2.coach.prepared_plan";
/** @deprecated Legacy session key — migrated into Amy Memory. */
export const V2_COACH_DISCOVER_GOAL_KEY = "amynest.v2.coach.discover_goal";

export type PreparedCoachPlan = {
  goalId: string;
  goalTitle: string;
  categoryId: string;
  worryId: FrontDoorWorryId;
  challengeLabel: string;
  preparedAt: string;
  gateDismissed: boolean;
};

function fromMemory(
  prepared: AmyMemoryPreparedCoach | null | undefined,
): PreparedCoachPlan | null {
  if (!prepared) return null;
  return { ...prepared };
}

export function readPreparedCoachPlan(): PreparedCoachPlan | null {
  return fromMemory(readAmyMemory()?.coach.prepared);
}

export function savePreparedCoachPlan(
  plan: Omit<PreparedCoachPlan, "preparedAt" | "gateDismissed"> & {
    gateDismissed?: boolean;
  },
): PreparedCoachPlan {
  const next: PreparedCoachPlan = {
    ...plan,
    preparedAt: new Date().toISOString(),
    gateDismissed: plan.gateDismissed ?? false,
  };
  ensureAmyMemory();
  updateAmyMemory(
    {
      coach: {
        status: "prepared",
        prepared: next,
        goalId: next.goalId,
        goalTitle: next.goalTitle,
      },
      challenge: {
        coachGoalId: next.goalId,
        label: next.challengeLabel,
        worryId: next.worryId,
      },
    },
    {
      source: "coach_bridge",
      sectionSources: {
        coach: "coach_bridge",
        challenge: "coach_bridge",
      },
    },
  );
  return next;
}

export function markPreparedCoachPlanGateDismissed(): void {
  const cur = readPreparedCoachPlan();
  if (!cur) return;
  updateAmyMemory(
    {
      coach: {
        status: "prepared",
        prepared: { ...cur, gateDismissed: true },
      },
    },
    { source: "coach_bridge", sectionSources: { coach: "coach_bridge" } },
  );
}

export function clearPreparedCoachPlan(): void {
  if (!readAmyMemory()) return;
  updateAmyMemory(
    {
      coach: {
        status: "none",
        prepared: null,
        goalId: null,
        goalTitle: null,
      },
      challenge: {
        coachGoalId: null,
      },
    },
    {
      source: "coach_bridge",
      sectionSources: {
        coach: "coach_bridge",
        challenge: "coach_bridge",
      },
    },
  );
}

export function stashCoachDiscoverGoal(goalId: string): void {
  ensureAmyMemory();
  updateAmyMemory(
    { coach: { discoverGoalId: goalId } },
    { source: "coach_bridge", sectionSources: { coach: "coach_bridge" } },
  );
}

export function peekCoachDiscoverGoal(): string | null {
  return readAmyMemory()?.coach.discoverGoalId ?? null;
}

export function consumeCoachDiscoverGoal(): string | null {
  const v = peekCoachDiscoverGoal();
  if (v) {
    updateAmyMemory(
      { coach: { discoverGoalId: null } },
      { source: "coach_bridge", sectionSources: { coach: "coach_bridge" } },
    );
  }
  return v;
}

export function clearCoachDiscoveryForTests(): void {
  if (!readAmyMemory()) return;
  updateAmyMemory(
    {
      coach: {
        status: "none",
        prepared: null,
        sessionId: null,
        goalId: null,
        goalTitle: null,
        discoverGoalId: null,
      },
      challenge: {
        coachGoalId: null,
      },
    },
    {
      source: "coach_bridge",
      sectionSources: {
        coach: "coach_bridge",
        challenge: "coach_bridge",
      },
    },
  );
}
