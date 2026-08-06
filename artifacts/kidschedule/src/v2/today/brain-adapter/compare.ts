/**
 * compareTodayLegacy — observe Legacy Today surface vs Brain snapshot.
 * Developer / QA only. Never drives UI.
 */

import { freezeDeep } from "./freeze";
import {
  AMY_TODAY_BRAIN_ADAPTER_VERSION,
  type LegacyTodaySurface,
  type TodayBrainSnapshot,
  type TodayLegacyCompareEntry,
  type TodayLegacyCompareResult,
  type TodayLegacyCompareStatus,
} from "./types";

function experienceStatus(
  legacyId: string | null,
  brainId: string | null,
): TodayLegacyCompareStatus {
  if (legacyId == null && brainId == null) return "MATCH";
  if (legacyId == null || brainId == null) return "UNKNOWN";
  return legacyId === brainId ? "MATCH" : "MISMATCH";
}

function aggregate(
  entries: ReadonlyArray<TodayLegacyCompareEntry>,
): TodayLegacyCompareStatus {
  if (entries.some((e) => e.status === "BRAIN_UNAVAILABLE")) {
    return "BRAIN_UNAVAILABLE";
  }
  if (entries.some((e) => e.status === "MISMATCH")) return "MISMATCH";
  if (entries.some((e) => e.status === "PARTIAL_MATCH")) return "PARTIAL_MATCH";
  if (entries.some((e) => e.status === "UNKNOWN")) {
    return entries.every(
      (e) => e.status === "UNKNOWN" || e.status === "MATCH",
    ) && entries.some((e) => e.status === "MATCH")
      ? "PARTIAL_MATCH"
      : "UNKNOWN";
  }
  return "MATCH";
}

/**
 * Compare Legacy Today surface facts with a TodayBrainSnapshot.
 * Pure · never throws · never mutates.
 */
export function compareTodayLegacy(
  legacy: LegacyTodaySurface,
  brain: TodayBrainSnapshot,
): TodayLegacyCompareResult {
  const entries: TodayLegacyCompareEntry[] = [];

  const push = (
    dimension: TodayLegacyCompareEntry["dimension"],
    status: TodayLegacyCompareStatus,
    legacyValue: unknown,
    brainValue: unknown,
    note: string | null,
  ) => {
    entries.push(
      freezeDeep({
        dimension,
        status,
        legacyValue,
        brainValue,
        note,
      }),
    );
  };

  if (!brain.brainAvailable) {
    push(
      "brain_availability",
      "BRAIN_UNAVAILABLE",
      true,
      false,
      "Brain snapshot unavailable — Legacy remains authoritative",
    );
    return freezeDeep({
      status: "BRAIN_UNAVAILABLE",
      entries: Object.freeze(entries),
      adapterVersion: AMY_TODAY_BRAIN_ADAPTER_VERSION,
    });
  }

  push(
    "brain_availability",
    "MATCH",
    true,
    true,
    null,
  );

  push(
    "primary",
    experienceStatus(
      legacy.primaryExperienceId,
      brain.resolvedHero?.experienceId ?? null,
    ),
    legacy.primaryExperienceId,
    brain.resolvedHero?.experienceId ?? null,
    null,
  );

  push(
    "secondary",
    experienceStatus(
      legacy.secondaryExperienceId,
      brain.resolvedSecondary?.experienceId ?? null,
    ),
    {
      experienceId: legacy.secondaryExperienceId,
      coachVisible: legacy.coachVisible,
    },
    brain.resolvedSecondary?.experienceId ?? null,
    null,
  );

  push(
    "passive",
    experienceStatus(
      legacy.passiveExperienceId,
      brain.resolvedPassive?.experienceId ?? null,
    ),
    {
      experienceId: legacy.passiveExperienceId,
      askAmyVisible: legacy.askAmyVisible,
      missionId: legacy.missionId,
    },
    brain.resolvedPassive?.experienceId ?? null,
    null,
  );

  return freezeDeep({
    status: aggregate(entries),
    entries: Object.freeze(entries),
    adapterVersion: AMY_TODAY_BRAIN_ADAPTER_VERSION,
  });
}
