/**
 * Tiered validation: HARD (reject), STRUCTURAL (auto-fix), SOFT (log only).
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { normalizeCountryCode } from "./routine-country-profile.js";
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import {
  enforceUaeOutdoorHardConstraint,
  type DecisionTraceEntry,
  type TieredValidationResult,
} from "./routine-priority-engine.js";
import {
  hardValidateSchedule,
  validateRoutineSchedule,
  type RoutineScheduleItem,
  type ScheduleOpts,
} from "./routine-scheduler.js";

export type { TieredValidationResult, ValidationTier } from "./routine-priority-engine.js";

export function runTieredValidation(
  items: RoutineScheduleItem[],
  wakeUpTime: string,
  sleepTime: string,
  opts: ScheduleOpts & { country?: string | LaunchCountry },
  state?: Pick<InterpretedBehavioralState, "country">,
  softWarnings: string[] = [],
): TieredValidationResult {
  const trace: DecisionTraceEntry[] = [];
  let working = items.map((i) => ({ ...i }));

  if (state && normalizeCountryCode(state.country) === "AE") {
    working = enforceUaeOutdoorHardConstraint(working, trace);
  }

  const structural = validateRoutineSchedule(working, wakeUpTime, sleepTime, {
    ...opts,
    skipMealReanchor: true,
  });
  working = structural.items;
  const structuralFixes = structural.errors.filter((e) => !structural.errors.includes("compacted timeline still invalid"));

  const hard = hardValidateSchedule(working, wakeUpTime, sleepTime);
  if (!hard.valid) {
    trace.push({
      kind: "validation",
      message: "HARD validation failed — schedule rejected",
      detail: { errors: hard.errors },
    });
    return {
      items: working,
      hardValid: false,
      structuralFixes,
      softWarnings,
      rejected: true,
      trace,
    };
  }

  for (const w of softWarnings) {
    trace.push({ kind: "validation", message: w, detail: { tier: "soft" } });
  }

  if (structuralFixes.length) {
    trace.push({
      kind: "structural",
      message: `STRUCTURAL auto-fixes applied (${structuralFixes.length})`,
      detail: { fixes: structuralFixes },
    });
  }

  return {
    items: working,
    hardValid: true,
    structuralFixes,
    softWarnings,
    rejected: false,
    trace,
  };
}
