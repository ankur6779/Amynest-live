/**
 * Routine safety gate — the single choke point that guarantees a routine is
 * safe before it is ever returned or persisted by any endpoint.
 *
 * It composes the EXISTING validators (no new safety rules, no scheduling /
 * pacing / continuity / personalization behavior change):
 *   1. AQI outdoor enforcement  (enforceOutdoorDurationLimits)
 *   2. Blocking trust validation (runBlockingTrustValidation) which covers:
 *        - required sleep anchor / bedtime window
 *        - required dinner before bedtime (age >= 36mo)
 *        - infant feeding + age-safe meal structure (age < 36mo)
 *
 * Endpoints that already run the full intelligence pipeline (AI / rule
 * generate) can call this with `skipAqiEnforcement: true` to re-assert trust
 * on the FINAL items without re-mutating outdoor blocks. Endpoints that build
 * routines outside the pipeline (partial regenerate) call it with the resolved
 * AQI so outdoor limits are enforced here.
 */
import { enforceOutdoorDurationLimits } from "./routine-aqi.js";
import {
  runBlockingTrustValidation,
  type TrustValidationOpts,
} from "./routine-trust-validators.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

export type RoutineSafetyOpts = TrustValidationOpts & {
  /** Resolved AQI used for outdoor duration enforcement. null/undefined = no clamp. */
  aqi?: number | null;
  /** Weather condition string (rain/storm tightens the outdoor cap). */
  weatherCondition?: string | null;
  /**
   * Skip AQI outdoor mutation and only run trust validation. Use when the
   * caller already enforced AQI (full pipeline) and just needs a final, honest
   * pass/fail on the exact items being returned.
   */
  skipAqiEnforcement?: boolean;
};

export type RoutineSafetyResult = {
  /** Items after AQI enforcement (or unchanged when skipAqiEnforcement). */
  items: RoutineScheduleItem[];
  /** True only when every blocking trust validator passes. */
  valid: boolean;
  /** Trust validator errors (empty when valid). */
  errors: string[];
  /** Human-readable AQI adjustments applied (empty when skipped / none). */
  adjustments: string[];
};

/**
 * Children under this age cannot use partial regenerate: their routines depend
 * on guaranteed feeding/nap structure and age-safe meals that the rule-based
 * partial generator does not produce. They must use full safe generation.
 */
export const PARTIAL_REGEN_MIN_AGE_MONTHS = 36;

/** Whether partial regenerate is allowed for the given age (in months). */
export function partialRegenAllowedForAge(
  ageInMonths: number | null | undefined,
): boolean {
  return (ageInMonths ?? 0) >= PARTIAL_REGEN_MIN_AGE_MONTHS;
}

/**
 * Enforce AQI + trust safety on a routine. Never throws. Callers MUST check
 * `valid` and refuse to return/persist the routine when it is false.
 */
export function enforceRoutineSafety(
  items: RoutineScheduleItem[],
  opts: RoutineSafetyOpts,
): RoutineSafetyResult {
  let working = items;
  const adjustments: string[] = [];

  if (!opts.skipAqiEnforcement) {
    const aqiPass = enforceOutdoorDurationLimits(working, {
      aqi: opts.aqi ?? null,
      country: opts.country,
      condition: opts.weatherCondition ?? null,
    });
    working = aqiPass.items;
    adjustments.push(...aqiPass.adjustments);
  }

  const trust = runBlockingTrustValidation(working, opts);

  return {
    items: working,
    valid: trust.valid,
    errors: trust.errors,
    adjustments,
  };
}
