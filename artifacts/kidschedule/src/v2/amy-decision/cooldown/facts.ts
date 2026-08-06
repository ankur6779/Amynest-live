/**
 * Derive Cooldown facts from AmyContext — caller-side helper.
 * Cooldown engine itself never reads Memory.
 */

import type { AmyContext } from "@/v2/amy-context";
import type { DecisionCooldownFacts } from "./types";

export function localDateKeyFromDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function cooldownFactsFromContext(
  context: AmyContext,
  now: Date = new Date(),
): DecisionCooldownFacts {
  const missionKey = context.mission.missionId
    ? [
        context.mission.missionId,
        context.mission.dateKey ?? "",
        context.mission.completedAt ?? "",
      ].join("|")
    : null;

  return Object.freeze({
    localDateKey: localDateKeyFromDate(now),
    challengeKey: context.challenge.worryId ?? null,
    missionKey,
    coachStatus: context.coach.status ?? null,
  });
}
