/**
 * Resolve routine generation inputs with safe defaults when fields are missing.
 */
import type { WeatherOutdoor } from "@workspace/family-routine";
import { normalizeTo24h } from "./routine-scheduler.js";

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
};

const DEFAULT_WAKE = "07:00";
const DEFAULT_SLEEP = "21:00";
const DEFAULT_SCHOOL_START = "09:00";
const DEFAULT_SCHOOL_END = "15:00";

export function resolveRoutineGenerationInputs(
  input: RoutineGenerationInputs,
  childDefaults?: Partial<RoutineGenerationInputs>,
): { resolved: ResolvedRoutineInputs; debug: InputResolutionDebug } {
  const defaultsApplied: string[] = [];

  const pick = <T>(key: keyof RoutineGenerationInputs, fallback: T): T => {
    const v = input[key] ?? childDefaults?.[key];
    if (v == null || v === "") {
      defaultsApplied.push(String(key));
      return fallback;
    }
    return v as T;
  };

  const wakeUpTime = normalizeTo24h(
    pick("wakeUpTime", childDefaults?.wakeUpTime ?? DEFAULT_WAKE),
  );
  const sleepTime = normalizeTo24h(
    pick("sleepTime", childDefaults?.sleepTime ?? DEFAULT_SLEEP),
  );
  const schoolStartTime = normalizeTo24h(
    pick("schoolStartTime", childDefaults?.schoolStartTime ?? DEFAULT_SCHOOL_START),
  );
  const schoolEndTime = normalizeTo24h(
    pick("schoolEndTime", childDefaults?.schoolEndTime ?? DEFAULT_SCHOOL_END),
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
    debug: { defaultsApplied },
  };
}
