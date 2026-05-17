/**
 * Human-realistic activity labels (time-of-day, indoor play, NZ nature).
 */
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { parseTimeToMins } from "./routine-scheduler.js";

const NZ_NATURE_ACTIVITIES = [
  "Beach walk & nature play",
  "Bush walk & outdoor exploration",
  "Nature scavenger hunt",
  "Backyard bird watching",
  "Stream-side exploration (supervised)",
] as const;

const GENERIC_NZ_OUTDOOR_RE =
  /\b(park or beach play|park|beach play|light outdoor play)\b/i;

/** Clock-appropriate session label — never "morning" after noon. */
export function sessionLabelFromClock(clockMins: number): string {
  if (clockMins < 12 * 60) return "morning";
  if (clockMins < 17 * 60) return "afternoon";
  return "evening";
}

export function formatSplitSessionName(baseActivity: string, clockMins: number): string {
  const clean = baseActivity.replace(/\s*\((?:morning|afternoon|evening)[^)]*\)/gi, "").trim();
  const label = sessionLabelFromClock(clockMins);
  return `${clean} (${label} session)`;
}

export function pickNzNatureActivity(seed: number): string {
  return NZ_NATURE_ACTIVITIES[Math.abs(seed) % NZ_NATURE_ACTIVITIES.length]!;
}

function isPlayCategory(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "play" || /\bplay\b/i.test(item.activity);
}

function alreadyIndoorPlay(activity: string): boolean {
  return /\bindoor\s+play\b/i.test(activity);
}

/**
 * AQI > 200 (and full indoor day): every play block reads as indoor — no ambiguity.
 */
export function relabelPlayForIndoorSafety(
  items: RoutineScheduleItem[],
  state: Pick<
    InterpretedBehavioralState,
    | "outdoorBlockedByAqi"
    | "replaceOutdoorNotShorten"
    | "dayPlanningMode"
    | "aqiMetroAdvisoryMode"
  >,
): RoutineScheduleItem[] {
  const forceIndoorPlay =
    (state.outdoorBlockedByAqi ||
      (state.replaceOutdoorNotShorten && state.dayPlanningMode === "indoor_day")) &&
    !state.aqiMetroAdvisoryMode;

  if (!forceIndoorPlay) return items;

  return items.map((item) => {
    if (!isPlayCategory(item)) return item;
    if (alreadyIndoorPlay(item.activity)) return item;

    let activity = item.activity;
    if (/\bevening\s+play\b/i.test(activity)) {
      activity = activity.replace(/\bevening\s+play\b/i, "Indoor play");
    } else if (/\bplay\s+with\s+parent\b/i.test(activity)) {
      activity = activity.replace(/\bplay\b/i, "Indoor play");
    } else if (/\bplay\b/i.test(activity)) {
      activity = activity.replace(/\bplay\b/i, "Indoor play");
    } else {
      activity = `Indoor play — ${activity}`;
    }

    return {
      ...item,
      activity,
      category: item.category === "outdoor" ? "creative" : item.category,
      notes: [
        item.notes,
        "Indoor play keeps lungs safer when air quality or weather is challenging.",
      ]
        .filter(Boolean)
        .join(" "),
    };
  });
}

/** Remove wrong time-of-day words from activity titles. */
export function stripMisleadingTimeWords(activity: string, clockMins: number): string {
  let a = activity;
  if (clockMins >= 12 * 60 && /\bmorning\b/i.test(a)) {
    a = a.replace(/\((?:morning)\s+session\)/gi, `(${sessionLabelFromClock(clockMins)} session)`);
    a = a.replace(/\s*\(morning\)\s*$/i, ` (${sessionLabelFromClock(clockMins)} session)`);
    a = a.replace(/\bmorning\s+session\b/gi, `${sessionLabelFromClock(clockMins)} session`);
  }
  if (clockMins < 12 * 60 && /\bevening\s+session\b/i.test(a)) {
    a = a.replace(/\bevening\s+session\b/gi, "morning session");
  }
  return a.trim();
}

export function localizeNzOutdoorLabel(
  activity: string,
  country: string,
  clockMins: number,
): string {
  if (country !== "NZ") return activity;
  if (!GENERIC_NZ_OUTDOOR_RE.test(activity)) return activity;
  return pickNzNatureActivity(clockMins);
}

/** Strip misleading session tags when clock does not match. */
export function fixMisleadingSessionLabels(items: RoutineScheduleItem[]): RoutineScheduleItem[] {
  return items.map((item) => {
    const clock = parseTimeToMins(item.time);
    let activity = stripMisleadingTimeWords(item.activity, clock);
    if (/\((?:morning|afternoon|evening)\s+session\)/i.test(activity)) {
      activity = formatSplitSessionName(activity, clock);
    }
    if (activity === item.activity) return item;
    return { ...item, activity };
  });
}
