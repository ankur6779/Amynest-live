/**
 * Weather-first day planning — shapes schedule structure before placement.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { normalizeCountryCode, windowMidpoint } from "./routine-country-profile.js";
import { aqiAdjustmentReason } from "./routine-aqi.js";
import type {
  InterpretedBehavioralState,
  RoutineRawContext,
} from "./routine-context-engine.js";
import {
  UAE_EVENING_OUTDOOR_WINDOW,
  isOutdoorBlockedByHeat,
} from "./routine-country-structure.js";
import type { DecisionTraceEntry } from "./routine-priority-engine.js";
import type { RoutineScheduleItemWithDecision } from "./routine-priority-engine.js";
import type { StructureBlockKind } from "./routine-country-structure.js";
import {
  formatSplitSessionName,
  localizeNzOutdoorLabel,
} from "./routine-activity-labels.js";
import {
  aqiOutdoorLimitNote,
  breathingSafetyNote,
  heatAfternoonBlockNote,
  heatEveningOnlyNote,
  hydrationHealthNote,
  indoorPlayAirNote,
  MIN_OUTDOOR_SPORT_MINS,
  rainSnowIndoorNote,
  windOutdoorNote,
} from "./routine-health-copy.js";
import { dropUnderMinOutdoorSport } from "./routine-output-polish.js";
import {
  clampDurationForCategory,
  parseTimeToMins,
  minsToTime24,
  isSleepItem,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

export type DayPlanningMode =
  | "normal"
  | "avoid_afternoon"
  | "indoor_day"
  | "limited_outdoor"
  | "evening_only";

/** Hot climates — no outdoor 12:00–17:30. */
export const HOT_AFTERNOON_BLOCK_WINDOW: readonly [number, number] = [
  12 * 60,
  17 * 60 + 30,
];

export const WEATHER_ADJUSTMENT_LABEL = "weather adjustment";

export function weatherAdjustmentReason(detail: string): string {
  return `${WEATHER_ADJUSTMENT_LABEL}: ${detail}`;
}

export function isHotAfternoon(clockMins: number): boolean {
  const [start, end] = HOT_AFTERNOON_BLOCK_WINDOW;
  return clockMins >= start && clockMins < end;
}

function isRainyOrIndoorOnly(ctx: RoutineRawContext): boolean {
  return ctx.weatherOutdoor === "no" || ctx.outdoorSuitability === "no";
}

function isSnowConditions(ctx: RoutineRawContext): boolean {
  return ctx.temperatureC != null && ctx.temperatureC <= 2;
}

function isExtremeHeat(ctx: RoutineRawContext, country: LaunchCountry): boolean {
  return (
    country === "AE" ||
    ctx.hydrationNeedLevel === "extreme" ||
    (ctx.temperatureC != null && ctx.temperatureC >= 40)
  );
}

function isHotDay(ctx: RoutineRawContext): boolean {
  return ctx.temperatureC != null && ctx.temperatureC >= 32;
}

/**
 * Core planning mode from weather + country (predictive, pre-schedule).
 */
export function deriveDayPlanningMode(
  ctx: RoutineRawContext,
  country: LaunchCountry,
): DayPlanningMode {
  if (isExtremeHeat(ctx, country)) return "evening_only";
  if (isRainyOrIndoorOnly(ctx) || isSnowConditions(ctx)) return "indoor_day";
  if (isHotDay(ctx)) return "avoid_afternoon";
  if (
    ctx.weatherOutdoor === "limited" ||
    ctx.outdoorSuitability === "limited" ||
    (ctx.temperatureC != null && ctx.temperatureC < 12)
  ) {
    return "limited_outdoor";
  }
  return "normal";
}

export type WeatherPlanningFlags = {
  dayPlanningMode: DayPlanningMode;
  replaceOutdoorNotShorten: boolean;
  blockAfternoonOutdoor: boolean;
  repositionOutdoorToMorningEvening: boolean;
  limitOutdoorShortenOnly: boolean;
  preferSaferOutdoorActivity: boolean;
  requireHydrationBreak: boolean;
  requireCozyIndoor: boolean;
};

export function weatherPlanningFlagsFromMode(
  mode: DayPlanningMode,
  ctx: RoutineRawContext,
  country: LaunchCountry,
): WeatherPlanningFlags {
  const c = normalizeCountryCode(country);
  const hot = isHotDay(ctx);
  return {
    dayPlanningMode: mode,
    replaceOutdoorNotShorten: mode === "indoor_day",
    blockAfternoonOutdoor: (mode === "avoid_afternoon" || mode === "evening_only") && hot,
    repositionOutdoorToMorningEvening:
      mode === "evening_only" || (mode === "avoid_afternoon" && hot),
    limitOutdoorShortenOnly: mode === "limited_outdoor",
    preferSaferOutdoorActivity: mode === "limited_outdoor" && c === "NZ",
    requireHydrationBreak:
      mode === "avoid_afternoon" ||
      mode === "evening_only" ||
      ctx.hydrationNeedLevel === "high" ||
      ctx.hydrationNeedLevel === "extreme",
    requireCozyIndoor:
      mode === "indoor_day" ||
      (mode === "limited_outdoor" && ctx.temperatureC != null && ctx.temperatureC < 8),
  };
}

const OUTDOOR_CATS = new Set(["outdoor", "outdoor_play"]);
const PLAY_CATS = new Set(["play", "outdoor", "exercise", "activity"]);
const OUTDOOR_RE =
  /\b(outdoor|park|cycling|cycle ride|bike ride|walk|nature|garden|playground|swim|run|jog|football|cricket|tennis|skating|fresh air)\b/i;
const EXTRACURRICULAR_RE =
  /\b(soccer|football club|sports practice|sports club|music|club)\b/i;
const HYDRATION_RE = /\b(hydration|water break)\b/i;
const COZY_RE = /\b(cozy|warm-up indoors|indoor warm)\b/i;
const AIR_SAFE_RE = /\b(air-safe|breathing-safe)\b/i;
const BOARD_GAMES_RE = /\b(board games|indoor exercise circuit)\b/i;

function isOutdoorItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (OUTDOOR_CATS.has(cat)) return true;
  return OUTDOOR_RE.test(item.activity);
}

function isWeatherSensitive(item: RoutineScheduleItem): boolean {
  if (isOutdoorItem(item)) return true;
  const cat = (item.category ?? "").toLowerCase();
  return cat === "exercise" && EXTRACURRICULAR_RE.test(item.activity);
}

/** Hot-day reposition — outdoor play and afternoon sports/clubs. */
function isHotRepositionCandidate(
  item: RoutineScheduleItem,
  state: InterpretedBehavioralState,
): boolean {
  if (isOutdoorItem(item)) return true;
  if (!state.blockAfternoonOutdoor) return false;
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "exercise" && EXTRACURRICULAR_RE.test(item.activity)) return true;
  if (!PLAY_CATS.has(cat)) return false;
  return OUTDOOR_RE.test(item.activity) || /outdoor play|backyard|park/i.test(item.activity);
}

function withWeatherDecision(
  item: RoutineScheduleItem,
  detail: string,
  originalActivity?: string,
  structureKind?: StructureBlockKind,
  reasonLabel: "weather" | "aqi" = "weather",
): RoutineScheduleItemWithDecision {
  const reason =
    reasonLabel === "aqi"
      ? aqiAdjustmentReason(detail)
      : weatherAdjustmentReason(detail);
  return {
    ...item,
    scheduleDecision: {
      reason,
      source: "safety",
      originalActivity,
    },
    structureKind,
  };
}

function morningOutdoorHint(state: InterpretedBehavioralState): number {
  const wakeMid = windowMidpoint(state.countryProfile.wakeWindow);
  return wakeMid + 45;
}

function eveningOutdoorHint(state: InterpretedBehavioralState): number {
  if (state.dayPlanningMode === "evening_only") {
    return UAE_EVENING_OUTDOOR_WINDOW[0];
  }
  const [dStart] = state.countryProfile.dinnerWindow;
  return Math.max(17 * 60 + 30, dStart - 90);
}

function saferOutdoorLabel(
  activity: string,
  country: LaunchCountry,
  clockMins: number,
): string {
  if (normalizeCountryCode(country) !== "NZ") return activity;
  return localizeNzOutdoorLabel(activity, "NZ", clockMins);
}

/**
 * Move outdoor blocks out of blocked afternoon windows (reposition, not shorten).
 */
function repositionOutdoorBlock(
  item: RoutineScheduleItemWithDecision,
  state: InterpretedBehavioralState,
  useEvening: boolean,
): RoutineScheduleItemWithDecision {
  const hint = useEvening ? eveningOutdoorHint(state) : morningOutdoorHint(state);
  const heatNote = useEvening ? heatEveningOnlyNote() : heatAfternoonBlockNote();
  return withWeatherDecision(
    {
      ...item,
      time: minsToTime24(hint),
      structureKind: useEvening ? "outdoor_evening" : "outdoor",
      notes: [item.notes, heatNote].filter(Boolean).join(" "),
    },
    heatNote,
    item.activity,
    useEvening ? "outdoor_evening" : "outdoor",
  );
}

function splitOutdoorIntoMorningEvening(
  item: RoutineScheduleItemWithDecision,
  state: InterpretedBehavioralState,
): RoutineScheduleItemWithDecision[] {
  const total = item.duration ?? 45;
  const morningDur = clampDurationForCategory(
    item.category ?? "outdoor",
    Math.max(20, Math.round(total * 0.45)),
  );
  const eveningDur = clampDurationForCategory(
    item.category ?? "outdoor",
    Math.max(20, total - morningDur),
  );
  const morningClock = morningOutdoorHint(state);
  const eveningClock = eveningOutdoorHint(state);
  const base = item.activity.replace(/\s*\([^)]*\)$/, "").trim();
  return [
    withWeatherDecision(
      {
        ...item,
        time: minsToTime24(morningClock),
        duration: morningDur,
        activity: formatSplitSessionName(base, morningClock),
        structureKind: "outdoor",
        notes: heatAfternoonBlockNote(),
      },
      "split outdoor into early session (hot day planning)",
      item.activity,
      "outdoor",
    ),
    withWeatherDecision(
      {
        ...item,
        time: minsToTime24(eveningClock),
        duration: eveningDur,
        activity: formatSplitSessionName(base, eveningClock),
        structureKind: "outdoor_evening",
        notes: heatEveningOnlyNote(),
      },
      "split outdoor into evening session (hot day planning)",
      item.activity,
      "outdoor_evening",
    ),
  ];
}

/**
 * Weather-first pass on activity list BEFORE cultural slots and scheduling.
 */
export function applyWeatherFirstPlanning(
  items: RoutineScheduleItemWithDecision[],
  state: InterpretedBehavioralState,
  trace: DecisionTraceEntry[] = [],
): RoutineScheduleItemWithDecision[] {
  const out: RoutineScheduleItemWithDecision[] = [];
  let eveningOutdoorUsed = false;
  let splitDone = false;

  trace.push({
    kind: "weather",
    message: `dayPlanningMode=${state.dayPlanningMode}`,
    detail: {
      country: state.country,
      blockAfternoon: state.blockAfternoonOutdoor,
      replaceNotShorten: state.replaceOutdoorNotShorten,
      aqi: state.aqi,
      aqiCategory: state.aqiCategory,
      outdoorBlockedByAqi: state.outdoorBlockedByAqi,
    },
  });

  for (const item of items) {
    const mustReplaceIndoor =
      isWeatherSensitive(item) &&
      (state.replaceOutdoorNotShorten || state.outdoorBlockedByAqi);

    if (mustReplaceIndoor) {
      const swap = state.outdoorBlockedByAqi
        ? state.preferIndoorHighEnergy
          ? {
              activity: "Indoor exercise circuit",
              category: "exercise",
              notes: indoorPlayAirNote(),
            }
          : {
              activity: "Indoor air-safe play",
              category: "creative",
              notes: indoorPlayAirNote(),
            }
        : state.preferIndoorCreative
          ? {
              activity: state.labels.indoorCreative,
              category: "creative",
              notes: rainSnowIndoorNote(),
            }
          : {
              activity: "Cozy indoor play",
              category: "creative",
              notes: rainSnowIndoorNote(),
            };
      const reasonLabel = state.outdoorBlockedByAqi ? "aqi" : "weather";
      const detail = state.outdoorBlockedByAqi
        ? indoorPlayAirNote()
        : rainSnowIndoorNote();
      out.push(
        withWeatherDecision(
          {
            ...item,
            activity: swap.activity,
            category: swap.category,
            notes: swap.notes,
            duration: clampDurationForCategory(
              swap.category,
              item.duration ?? 30,
            ),
            structureKind:
              swap.category === "exercise" ? "indoor_rest" : "indoor_creative",
          },
          detail,
          item.activity,
          swap.category === "exercise" ? "indoor_rest" : "indoor_creative",
          reasonLabel,
        ),
      );
      continue;
    }

    if (
      isOutdoorItem(item) &&
      state.maxOutdoorDurationFromAqi != null &&
      state.maxOutdoorDurationFromAqi > 0
    ) {
      if (state.maxOutdoorDurationFromAqi < MIN_OUTDOOR_SPORT_MINS) {
        trace.push({
          kind: "weather",
          message: "Skipped outdoor block — air quality does not allow a meaningful outdoor session",
          detail: { activity: item.activity, aqi: state.aqi },
        });
        continue;
      }
      if ((item.duration ?? 30) > state.maxOutdoorDurationFromAqi) {
        const aqiNote =
          aqiOutdoorLimitNote(state.aqi, state.maxOutdoorDurationFromAqi) ??
          "Air quality is moderate — limit outdoor time";
        out.push(
          withWeatherDecision(
            {
              ...item,
              duration: state.maxOutdoorDurationFromAqi,
              notes: [item.notes, aqiNote].filter(Boolean).join(" "),
            },
            aqiNote,
            item.activity,
            "outdoor",
            "aqi",
          ),
        );
        continue;
      }
    }

    if (
      isHotRepositionCandidate(item, state) &&
      state.repositionOutdoorToMorningEvening &&
      !splitDone
    ) {
      const clock = parseTimeToMins(item.time);
      const inAfternoon =
        state.blockAfternoonOutdoor && isHotAfternoon(clock);
      const forceEveningOnly = state.dayPlanningMode === "evening_only";

      if (forceEveningOnly) {
        if (!eveningOutdoorUsed) {
          out.push(repositionOutdoorBlock(item, state, true));
          eveningOutdoorUsed = true;
        }
        continue;
      }

      if (inAfternoon || state.dayPlanningMode === "avoid_afternoon") {
        const sessions = splitOutdoorIntoMorningEvening(item, state);
        out.push(...sessions);
        eveningOutdoorUsed = true;
        splitDone = true;
        continue;
      }
    }

    if (
      state.maxOutdoorDurationFromAqi != null &&
      state.maxOutdoorDurationFromAqi > 0 &&
      !state.outdoorBlockedByAqi &&
      (item.category === "exercise" ||
        /\b(soccer|cricket|sports|training|practice)\b/i.test(item.activity))
    ) {
      out.push(
        withWeatherDecision(
          {
            ...item,
            activity: "Low-exertion movement (indoor or brief outdoor)",
            category: "exercise",
            duration: Math.min(
              item.duration ?? 30,
              state.maxOutdoorDurationFromAqi + 10,
            ),
            notes: [
              item.notes,
              "Easier movement today — air quality calls for lighter activity.",
            ]
              .filter(Boolean)
              .join(" "),
          },
          "Lighter activity for air quality",
          item.activity,
          "indoor_rest",
          "aqi",
        ),
      );
      continue;
    }

    if (
      isOutdoorItem(item) &&
      state.limitOutdoorShortenOnly &&
      state.preferSaferOutdoorActivity
    ) {
      out.push(
        withWeatherDecision(
          {
            ...item,
            activity: saferOutdoorLabel(
              item.activity,
              state.country,
              parseTimeToMins(item.time),
            ),
            notes: [item.notes, windOutdoorNote()].filter(Boolean).join(" "),
          },
          "wind-safe outdoor activity type (NZ windy)",
          item.activity,
          "outdoor",
        ),
      );
      continue;
    }

    out.push(item);
  }

  if (state.requireHydrationBreak && !out.some((i) => HYDRATION_RE.test(i.activity))) {
    const schoolEnd = windowMidpoint(state.countryProfile.schoolEndTimeRange);
    out.push(
      withWeatherDecision(
        {
          time: minsToTime24(Math.max(17 * 60, schoolEnd + 90)),
          activity: "Hydration break",
          duration: 15,
          category: "rest",
          notes: hydrationHealthNote(),
          status: "pending",
        },
        "hydration break added for hot weather",
        undefined,
        "indoor_rest",
      ),
    );
    trace.push({
      kind: "weather",
      message: weatherAdjustmentReason("hydration break scheduled"),
    });
  }

  if (state.requireAirSafeIndoorBlocks) {
    const schoolEnd = windowMidpoint(state.countryProfile.schoolEndTimeRange);
    if (!out.some((i) => AIR_SAFE_RE.test(i.activity))) {
      out.push(
        withWeatherDecision(
          {
            time: minsToTime24(schoolEnd + 50),
            activity: "Indoor air-safe play",
            duration: 35,
            category: "creative",
            notes: indoorPlayAirNote(),
            status: "pending",
          },
          "scheduled for poor air quality",
          undefined,
          "indoor_creative",
          "aqi",
        ),
      );
    }
    if (!out.some((i) => /\bbreathing-safe\b/i.test(i.activity))) {
      out.push(
        withWeatherDecision(
          {
            time: minsToTime24(schoolEnd + 95),
            activity: "Breathing-safe environment",
            duration: 20,
            category: "rest",
            notes: breathingSafetyNote(),
            status: "pending",
          },
          "breathing-safe rest block",
          undefined,
          "indoor_rest",
          "aqi",
        ),
      );
    }
    if (
      state.requireHydrationBreak &&
      !out.some((i) => HYDRATION_RE.test(i.activity))
    ) {
      out.push(
        withWeatherDecision(
          {
            time: minsToTime24(17 * 60),
            activity: "Hydration break",
            duration: 15,
            category: "rest",
            notes: hydrationHealthNote(),
            status: "pending",
          },
          "hydration during high AQI",
          undefined,
          "indoor_rest",
          "aqi",
        ),
      );
    }
    if (!out.some((i) => BOARD_GAMES_RE.test(i.activity))) {
      out.push(
        withWeatherDecision(
          {
            time: minsToTime24(schoolEnd + 140),
            activity: "Board games & puzzles",
            duration: 30,
            category: "creative",
            notes: indoorPlayAirNote(),
            status: "pending",
          },
          "indoor cognitive play",
          undefined,
          "indoor_creative",
          "aqi",
        ),
      );
    }
    trace.push({
      kind: "weather",
      message: aqiAdjustmentReason("air-safe indoor blocks scheduled"),
      detail: { aqi: state.aqi },
    });
  }

  if (state.requireCozyIndoor && !out.some((i) => COZY_RE.test(i.activity))) {
    const schoolEnd = windowMidpoint(state.countryProfile.schoolEndTimeRange);
    out.push(
      withWeatherDecision(
        {
          time: minsToTime24(schoolEnd + 45),
          activity: "Cozy indoor warm-up",
          duration: 30,
          category: "creative",
          notes: "Warm indoor activity — cold or snowy conditions.",
          status: "pending",
        },
        "cozy indoor block for cold/snow",
        undefined,
        "indoor_creative",
      ),
    );
    trace.push({
      kind: "weather",
      message: weatherAdjustmentReason("cozy indoor block scheduled"),
    });
  }

  return dropUnderMinOutdoorSport(out, state, trace).items;
}

/**
 * After cultural slots — ensure hot-day outdoor is split/repositioned, not left in afternoon.
 */
export function repositionOutdoorSessions(
  items: RoutineScheduleItemWithDecision[],
  state: InterpretedBehavioralState,
): RoutineScheduleItemWithDecision[] {
  if (!state.repositionOutdoorToMorningEvening) return items;

  const result: RoutineScheduleItemWithDecision[] = [];
  let splitDone = items.some((i) => /\(morning\)|\(evening\)/i.test(i.activity));

  for (const item of items) {
    if (
      !splitDone &&
      isHotRepositionCandidate(item, state) &&
      !/\b(hydration|cozy)\b/i.test(item.activity)
    ) {
      const clock = parseTimeToMins(item.time);
      if (
        state.dayPlanningMode === "evening_only" ||
        (state.blockAfternoonOutdoor && isHotAfternoon(clock))
      ) {
        if (state.dayPlanningMode === "evening_only") {
          result.push(repositionOutdoorBlock(item, state, true));
        } else {
          result.push(...splitOutdoorIntoMorningEvening(item, state));
        }
        splitDone = true;
        continue;
      }
    }
    result.push(item);
  }
  return result;
}

/** Clock-time guard: no outdoor may start before UAE evening window. */
export function enforceOutdoorTimeGuards(
  items: RoutineScheduleItem[],
  state: Pick<InterpretedBehavioralState, "country" | "dayPlanningMode" | "blockAfternoonOutdoor">,
  trace: DecisionTraceEntry[] = [],
): RoutineScheduleItem[] {
  return items.map((it) => {
    const needsGuard =
      isOutdoorItem(it) ||
      (state.blockAfternoonOutdoor &&
        (it.category ?? "").toLowerCase() === "exercise" &&
        EXTRACURRICULAR_RE.test(it.activity));
    if (!needsGuard) return it;
    let start = parseTimeToMins(it.time);

    if (normalizeCountryCode(state.country) === "AE" && isOutdoorBlockedByHeat(start, "AE")) {
      start = UAE_EVENING_OUTDOOR_WINDOW[0];
      trace.push({
        kind: "weather",
        message: weatherAdjustmentReason(`UAE outdoor moved to ${minsToTime24(start)}`),
        detail: { activity: it.activity },
      });
      return {
        ...it,
        time: minsToTime24(start),
        structureKind: "outdoor_evening" as StructureBlockKind,
      };
    }

    if (state.blockAfternoonOutdoor && isHotAfternoon(start)) {
      const evening = eveningOutdoorHint(state as InterpretedBehavioralState);
      trace.push({
        kind: "weather",
        message: weatherAdjustmentReason(
          `afternoon outdoor blocked — moved to ${minsToTime24(evening)}`,
        ),
        detail: { activity: it.activity, from: it.time },
      });
      return {
        ...it,
        time: minsToTime24(evening),
        structureKind: "outdoor_evening" as StructureBlockKind,
        scheduleDecision: {
          reason: weatherAdjustmentReason("no outdoor 12:00–17:30 on hot day"),
          source: "safety",
          originalActivity: it.activity,
        },
      };
    }

    return it;
  });
}

/** Sleep must be the final block — drop or trim anything scheduled after sleep. */
export function enforceSleepIsLast(
  items: RoutineScheduleItem[],
  trace: DecisionTraceEntry[] = [],
): RoutineScheduleItem[] {
  const sleep = items.find(isSleepItem);
  if (!sleep) return items;

  const sleepStart = parseTimeToMins(sleep.time);
  const kept: RoutineScheduleItem[] = [];
  const removed: string[] = [];

  for (const it of items) {
    if (isSleepItem(it)) {
      kept.push(it);
      continue;
    }
    if (parseTimeToMins(it.time) >= sleepStart) {
      removed.push(it.activity);
      continue;
    }
    kept.push(it);
  }

  if (removed.length) {
    trace.push({
      kind: "structural",
      message: weatherAdjustmentReason(
        `removed ${removed.length} block(s) after sleep anchor`,
      ),
      detail: { removed },
    });
  }

  kept.sort((a, b) => {
    if (isSleepItem(a)) return 1;
    if (isSleepItem(b)) return -1;
    return parseTimeToMins(a.time) - parseTimeToMins(b.time);
  });

  return kept;
}
