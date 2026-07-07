import type { Season, TimeOfDay } from "../types.js";

/**
 * Raw context inputs. Every field is optional: the engine only reasons about
 * what it is actually given and never fabricates missing context (e.g. it will
 * not invent weather). Callers pass whatever they cheaply have.
 */
export interface ContextInput {
  /** Local hour 0–23. */
  hourLocal?: number | null;
  /** 0=Sun … 6=Sat. */
  weekday?: number | null;
  season?: Season | null;
  /** True on public/religious holidays where known. */
  isHoliday?: boolean | null;
  /** True during the local school term (vs. break), where known. */
  isSchoolDay?: boolean | null;
  /** Whole days until the child's next birthday (0 = today). */
  childBirthdayInDays?: number | null;
  /** Weather bucket where available, e.g. "rain", "clear", "hot", "cold". */
  weather?: string | null;
  /** User-configured routine anchor hours, when known. */
  breakfastHour?: number | null;
  lunchHour?: number | null;
  dinnerHour?: number | null;
  bedtimeHour?: number | null;
}

export type ContextMoment =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "weekend"
  | "holiday"
  | "school_day"
  | "mealtime"
  | "bedtime_approaching"
  | "birthday_week"
  | "birthday_today"
  | "rainy_day"
  | "seasonal";

export interface ContextAssessment {
  /** Active contextual moments, most specific first. */
  moments: ContextMoment[];
  timeOfDay: TimeOfDay | null;
  /** 0–1: how much real context we had to work with (drives naturalness). */
  richness: number;
  /** True when nothing reliable was known — caller should use neutral timing. */
  degraded: boolean;
}

const MEAL_WINDOW_HOURS = 1;
const BEDTIME_LOOKAHEAD_HOURS = 1;

/**
 * Assess the natural context around "now" so notifications feel well-timed.
 * Pure and side-effect free. Gracefully degrades: with no inputs it returns an
 * empty, `degraded: true` assessment rather than guessing.
 */
export function assessContext(input: ContextInput): ContextAssessment {
  const moments: ContextMoment[] = [];
  let knownFields = 0;

  const timeOfDay = input.hourLocal != null ? hourToTimeOfDay(input.hourLocal) : null;
  if (input.hourLocal != null) {
    knownFields++;
    if (timeOfDay) moments.push(timeOfDay);

    if (isNearHour(input.hourLocal, input.breakfastHour) ||
        isNearHour(input.hourLocal, input.lunchHour) ||
        isNearHour(input.hourLocal, input.dinnerHour)) {
      moments.push("mealtime");
    }
    if (input.bedtimeHour != null &&
        input.hourLocal >= input.bedtimeHour - BEDTIME_LOOKAHEAD_HOURS &&
        input.hourLocal < input.bedtimeHour) {
      moments.push("bedtime_approaching");
    }
  }

  if (input.weekday != null) {
    knownFields++;
    if (input.weekday === 0 || input.weekday === 6) moments.push("weekend");
  }

  if (input.isHoliday === true) {
    knownFields++;
    moments.push("holiday");
  } else if (input.isHoliday === false) {
    knownFields++;
  }

  if (input.isSchoolDay === true) {
    knownFields++;
    moments.push("school_day");
  } else if (input.isSchoolDay === false) {
    knownFields++;
  }

  if (input.childBirthdayInDays != null) {
    knownFields++;
    if (input.childBirthdayInDays === 0) moments.push("birthday_today");
    else if (input.childBirthdayInDays > 0 && input.childBirthdayInDays <= 7) {
      moments.push("birthday_week");
    }
  }

  if (input.weather != null) {
    knownFields++;
    if (input.weather.toLowerCase().includes("rain")) moments.push("rainy_day");
  }

  if (input.season != null) {
    knownFields++;
    if (input.season === "festive") moments.push("seasonal");
  }

  const richness = round2(Math.min(1, knownFields / 5));
  return {
    moments,
    timeOfDay,
    richness,
    degraded: knownFields === 0,
  };
}

/** True when the candidate category is a natural fit for the current context. */
export function contextFavorsCategory(
  assessment: ContextAssessment,
  category: string,
): boolean {
  const m = new Set(assessment.moments);
  switch (category) {
    case "good_night":
    case "story_time":
      return m.has("bedtime_approaching") || m.has("night") || m.has("evening");
    case "nutrition":
      return m.has("mealtime") || m.has("midday") || m.has("afternoon");
    case "routine":
    case "routine_item":
      return m.has("morning");
    case "phonics":
    case "learning_activity":
      return m.has("school_day") || m.has("afternoon") || m.has("midday");
    case "milestone":
      return m.has("birthday_week") || m.has("birthday_today");
    default:
      return true;
  }
}

function hourToTimeOfDay(hour: number): TimeOfDay {
  if (hour < 6) return "night";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

function isNearHour(hour: number, anchor: number | null | undefined): boolean {
  if (anchor == null) return false;
  return Math.abs(hour - anchor) <= MEAL_WINDOW_HOURS;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
