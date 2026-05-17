/**
 * Final UX polish — labels, durations, human copy (post-schedule).
 */
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import { windowMidpoint } from "./routine-country-profile.js";
import type { DecisionTraceEntry } from "./routine-priority-engine.js";
import {
  clarifyAmbiguousPlayLabels,
  fixMisleadingSessionLabels,
  localizeNzOutdoorLabel,
  relabelPlayForIndoorSafety,
  stripMisleadingTimeWords,
} from "./routine-activity-labels.js";
import { applyExposureModeAdaptations, FALLBACK_ENV_REASON } from "./routine-aqi.js";
import {
  humanizeEnvironmentReason,
  indoorPlayAirNote,
  isOutdoorOrSportBlock,
  MIN_OUTDOOR_SPORT_MINS,
} from "./routine-health-copy.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { parseTimeToMins } from "./routine-scheduler.js";

export function polishRoutineOutput<T extends RoutineScheduleItem>(
  items: T[],
  state: InterpretedBehavioralState,
  trace: DecisionTraceEntry[] = [],
): T[] {
  let out = relabelPlayForIndoorSafety(items, state) as T[];
  out = clarifyAmbiguousPlayLabels(out) as T[];
  out = fixMisleadingSessionLabels(out) as T[];
  out = out.map((item) => {
    const clock = parseTimeToMins(item.time);
    const activity = localizeNzOutdoorLabel(
      stripMisleadingTimeWords(item.activity, clock),
      state.country,
      clock,
    );
    let notes = item.notes ? humanizeEnvironmentReason(item.notes) : item.notes;
    if (
      state.outdoorBlockedByAqi &&
      /\bindoor play\b/i.test(activity) &&
      notes &&
      !/breathing|air quality|indoor|purifier/i.test(notes)
    ) {
      notes = [notes, indoorPlayAirNote()].filter(Boolean).join(" ");
    }
    const scheduleDecision = item.scheduleDecision
      ? {
          ...item.scheduleDecision,
          reason: item.scheduleDecision.reason
            ? humanizeEnvironmentReason(item.scheduleDecision.reason)
            : item.scheduleDecision.reason,
        }
      : item.scheduleDecision;

    if (activity === item.activity && notes === item.notes && scheduleDecision === item.scheduleDecision) {
      return item;
    }
    return { ...item, activity, notes, scheduleDecision };
  });

  out = applyExposureModeAdaptations(out, {
    aqi: state.aqi,
    country: state.country,
    policy: state.aqiPolicy,
    schoolEndMins: windowMidpoint(state.countryProfile.schoolEndTimeRange),
    wakeMins: windowMidpoint(state.countryProfile.wakeWindow),
    environmentDataConfidence: state.environmentDataConfidence,
  });

  if (state.environmentDataConfidence === "low") {
    out = out.map((item) => {
      const cap = state.maxOutdoorDurationFromAqi ?? 20;
      const shortOutdoor =
        /\boutdoor play \(limited\)/i.test(item.activity) ||
        (item as { structureKind?: string }).structureKind === "outdoor_evening";
      const duration = shortOutdoor
        ? Math.min(15, Math.max(10, Math.min(item.duration ?? cap, cap)))
        : item.duration;
      return {
        ...item,
        duration,
        scheduleDecision: {
          source: item.scheduleDecision?.source ?? ("health" as const),
          reason: FALLBACK_ENV_REASON,
          originalActivity: item.scheduleDecision?.originalActivity,
        },
      };
    }) as T[];
  }

  const { items: kept, removed } = dropUnderMinOutdoorSport(out, state, trace);
  return kept;
}

export function dropUnderMinOutdoorSport<T extends RoutineScheduleItem>(
  items: T[],
  state?: Pick<
    InterpretedBehavioralState,
    | "aqiMetroAdvisoryMode"
    | "maxOutdoorDurationFromAqi"
    | "environmentDataConfidence"
  >,
  trace: DecisionTraceEntry[] = [],
): { items: T[]; removed: string[] } {
  const removed: string[] = [];
  const policyCap = state?.maxOutdoorDurationFromAqi;
  const metroMin =
    state?.aqiMetroAdvisoryMode && policyCap != null
      ? Math.min(MIN_OUTDOOR_SPORT_MINS, policyCap)
      : MIN_OUTDOOR_SPORT_MINS;
  const lowConfidenceFloor =
    state?.environmentDataConfidence === "low" ? 10 : metroMin;

  const kept = items.filter((item) => {
    if (/school|sleep|wake|meal|breakfast|dinner|refuel|snack|hydration|wind-down/i.test(item.activity)) {
      return true;
    }
    if (!isOutdoorOrSportBlock(item)) return true;
    const dur = item.duration ?? 30;
    if (state?.aqiMetroAdvisoryMode && /\blight outdoor walk\b/i.test(item.activity)) {
      return dur >= Math.min(15, metroMin);
    }
    if (state?.environmentDataConfidence === "low" && /\boutdoor play\b/i.test(item.activity)) {
      return dur >= 10;
    }
    if (dur >= lowConfidenceFloor) return true;
    removed.push(`${item.activity} (${dur}min)`);
    return false;
  });
  if (removed.length) {
    trace.push({
      kind: "weather",
      message: `Removed unrealistically short outdoor/sport blocks (<${MIN_OUTDOOR_SPORT_MINS} min)`,
      detail: { removed },
    });
  }
  return { items: kept, removed };
}
