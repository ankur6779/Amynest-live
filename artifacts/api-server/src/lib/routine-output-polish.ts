/**
 * Final UX polish — labels, durations, human copy (post-schedule).
 */
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import { windowMidpoint } from "./routine-country-profile.js";
import type { DecisionTraceEntry } from "./routine-priority-engine.js";
import {
  fixMisleadingSessionLabels,
  localizeNzOutdoorLabel,
  relabelPlayForIndoorSafety,
  stripMisleadingTimeWords,
} from "./routine-activity-labels.js";
import { applyExposureModeAdaptations } from "./routine-aqi.js";
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
  });

  const { items: kept, removed } = dropUnderMinOutdoorSport(out, state, trace);
  return kept;
}

export function dropUnderMinOutdoorSport<T extends RoutineScheduleItem>(
  items: T[],
  state?: Pick<
    InterpretedBehavioralState,
    "aqiMetroAdvisoryMode" | "maxOutdoorDurationFromAqi"
  >,
  trace: DecisionTraceEntry[] = [],
): { items: T[]; removed: string[] } {
  const removed: string[] = [];
  const metroMin =
    state?.aqiMetroAdvisoryMode && state.maxOutdoorDurationFromAqi != null
      ? state.maxOutdoorDurationFromAqi
      : MIN_OUTDOOR_SPORT_MINS;

  const kept = items.filter((item) => {
    if (/school|sleep|wake|meal|breakfast|dinner|refuel|snack|hydration|wind-down/i.test(item.activity)) {
      return true;
    }
    if (!isOutdoorOrSportBlock(item)) return true;
    const dur = item.duration ?? 30;
    if (state?.aqiMetroAdvisoryMode && /\blight outdoor walk\b/i.test(item.activity)) {
      return dur >= Math.min(15, metroMin);
    }
    if (dur >= metroMin) return true;
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
