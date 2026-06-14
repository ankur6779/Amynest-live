/**
 * ============================================
 * PRODUCTION CERTIFIED — FROZEN
 * ============================================
 *
 * Certification:
 * - 54 scenario matrix
 * - 0 FAIL
 * - 0 health regressions
 * - 0 status regressions
 *
 * Known accepted warnings:
 * - India teen dinner geometry
 * - UAE teen dinner geometry
 * - USA toddler dinner edge case
 *
 * Do not modify timing behavior without:
 * 1. Architecture approval
 * 2. Full recertification (pnpm run check:routine-engine-certification)
 *
 * Routine Engine Version: v1.0 Certified (June 2026)
 * Registry: docs/routine-engine/ROUTINE_ENGINE_FROZEN_FILES.md
 * ============================================
 *
 * Resolve routine generation inputs with safe defaults when fields are missing.
 */
import type { WeatherOutdoor } from "@workspace/family-routine";
import {
  validateAndNormalizeTime,
  type TimeValidationResult,
} from "./routine-time-validation.js";

export type RoutineGenerationInputs = {
  wakeUpTime?: string | null;
  sleepTime?: string | null;
  schoolStartTime?: string | null;
  schoolEndTime?: string | null;
  hasSchool?: boolean | null;
  weatherOutdoor?: WeatherOutdoor | null;
  mood?: string | null;
  specialPlans?: string | null;
  fridgeItems?: string | null;
};

export type ResolvedRoutineInputs = {
  wakeUpTime: string;
  sleepTime: string;
  schoolStartTime: string;
  schoolEndTime: string;
  hasSchool: boolean;
  weatherOutdoor: WeatherOutdoor;
  mood: string;
  specialPlans: string;
  fridgeItems: string;
};

export type InputResolutionDebug = {
  defaultsApplied: string[];
  /** Fields where invalid clock input was replaced with a safe fallback. */
  timesSanitized: string[];
};

const DEFAULT_WAKE = "07:00";
const DEFAULT_SLEEP = "21:00";
const DEFAULT_SCHOOL_START = "09:00";
const DEFAULT_SCHOOL_END = "15:00";

function resolveTimeField(
  key: keyof Pick<
    RoutineGenerationInputs,
    "wakeUpTime" | "sleepTime" | "schoolStartTime" | "schoolEndTime"
  >,
  input: RoutineGenerationInputs,
  childDefaults: Partial<RoutineGenerationInputs> | undefined,
  fallback: string,
  defaultsApplied: string[],
  timesSanitized: string[],
): string {
  const raw = input[key] ?? childDefaults?.[key];
  if (raw == null || String(raw).trim() === "") {
    defaultsApplied.push(String(key));
  }
  const childFallback =
    childDefaults?.[key] != null && String(childDefaults[key]).trim() !== ""
      ? String(childDefaults[key])
      : fallback;
  const result: TimeValidationResult = validateAndNormalizeTime(raw, {
    fallback: childFallback,
    field: String(key),
  });
  if (result.sanitized) {
    timesSanitized.push(String(key));
    if (raw != null && String(raw).trim() !== "") {
      defaultsApplied.push(`${String(key)}_invalid`);
    }
  }
  return result.time;
}

export function resolveRoutineGenerationInputs(
  input: RoutineGenerationInputs,
  childDefaults?: Partial<RoutineGenerationInputs>,
): { resolved: ResolvedRoutineInputs; debug: InputResolutionDebug } {
  const defaultsApplied: string[] = [];
  const timesSanitized: string[] = [];

  const wakeUpTime = resolveTimeField(
    "wakeUpTime",
    input,
    childDefaults,
    DEFAULT_WAKE,
    defaultsApplied,
    timesSanitized,
  );
  const sleepTime = resolveTimeField(
    "sleepTime",
    input,
    childDefaults,
    DEFAULT_SLEEP,
    defaultsApplied,
    timesSanitized,
  );
  const schoolStartTime = resolveTimeField(
    "schoolStartTime",
    input,
    childDefaults,
    DEFAULT_SCHOOL_START,
    defaultsApplied,
    timesSanitized,
  );
  const schoolEndTime = resolveTimeField(
    "schoolEndTime",
    input,
    childDefaults,
    DEFAULT_SCHOOL_END,
    defaultsApplied,
    timesSanitized,
  );

  const hasSchool =
    input.hasSchool ?? childDefaults?.hasSchool ?? false;

  const weatherOutdoor =
    input.weatherOutdoor ?? childDefaults?.weatherOutdoor ?? ("yes" as WeatherOutdoor);
  if (input.weatherOutdoor == null && childDefaults?.weatherOutdoor == null) {
    defaultsApplied.push("weatherOutdoor");
  }

  const mood = (input.mood ?? childDefaults?.mood ?? "normal").trim() || "normal";
  if (!input.mood?.trim() && !childDefaults?.mood?.trim()) {
    defaultsApplied.push("mood");
  }

  return {
    resolved: {
      wakeUpTime,
      sleepTime,
      schoolStartTime,
      schoolEndTime,
      hasSchool: Boolean(hasSchool),
      weatherOutdoor,
      mood,
      specialPlans: (input.specialPlans ?? childDefaults?.specialPlans ?? "").trim(),
      fridgeItems: (input.fridgeItems ?? childDefaults?.fridgeItems ?? "").trim(),
    },
    debug: { defaultsApplied, timesSanitized },
  };
}

/** Re-export for route layers that validate a single client override. */
export { validateAndNormalizeTime } from "./routine-time-validation.js";
