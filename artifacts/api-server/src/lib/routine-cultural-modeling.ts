/**
 * Light cultural modeling — naming and notes only on an already-scheduled routine.
 * Does NOT re-timeline or override wake/sleep/school/meals.
 */
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import { getCountryLabelPack } from "./routine-country-profile.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

export type CulturalModelingChange = {
  activity: string;
  field: "activity" | "notes";
  reason: string;
  culturalTag: string;
};

function isPinnedItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "sleep" ||
    cat === "school" ||
    cat === "meal" ||
    cat === "tiffin" ||
    /\b(breakfast|lunch|dinner|tiffin|wake|sleep|bedtime)\b/i.test(item.activity)
  );
}

/**
 * Post-schedule cultural pass: localized labels + cultural tags only.
 */
export function applyCulturalModeling(
  items: RoutineScheduleItem[],
  state: InterpretedBehavioralState,
  opts?: { ageInMonths?: number },
): { items: RoutineScheduleItem[]; changes: CulturalModelingChange[] } {
  if (opts?.ageInMonths != null && opts.ageInMonths < 6) {
    return { items, changes: [] };
  }

  const labels = state.labels ?? getCountryLabelPack(state.country);
  const changes: CulturalModelingChange[] = [];

  const out = items.map((item) => {
    if (isPinnedItem(item)) return item;

    const cat = (item.category ?? "").toLowerCase();
    let next = { ...item };

    if (/\b(homework|study|learning)\b/i.test(item.activity) && cat === "study") {
      if (item.activity !== labels.studyBlock) {
        changes.push({
          activity: item.activity,
          field: "activity",
          reason: `${state.country} academic labeling`,
          culturalTag: `academic_${state.country.toLowerCase()}`,
        });
        next = {
          ...next,
          activity: labels.studyBlock,
          culturalTag: `academic_${state.country.toLowerCase()}`,
        };
      }
    } else if (
      (cat === "outdoor" || /\b(outdoor|park|playground)\b/i.test(item.activity)) &&
      state.allowOutdoor
    ) {
      if (state.countryProfile.outdoorPreference === "high") {
        changes.push({
          activity: item.activity,
          field: "activity",
          reason: `${state.country} outdoor lifestyle`,
          culturalTag: `outdoor_high_${state.country.toLowerCase()}`,
        });
        next = {
          ...next,
          activity: labels.outdoorPlay,
          culturalTag: `outdoor_high_${state.country.toLowerCase()}`,
        };
      }
    } else if (/\b(soccer|football|sports|music|club|practice)\b/i.test(item.activity)) {
      next = {
        ...next,
        culturalTag: `extracurricular_${state.country.toLowerCase()}`,
      };
    } else if (/\bfamily\b/i.test(item.activity)) {
      next = {
        ...next,
        activity: labels.familyTime,
        culturalTag: `family_${state.country.toLowerCase()}`,
      };
    }

    if (state.country === "AE" && /play|outdoor|exercise/i.test(cat)) {
      next = {
        ...next,
        notes:
          (next.notes ? `${next.notes} ` : "") +
          "Evening-friendly timing — avoids peak daytime heat.",
        culturalTag: next.culturalTag ?? `evening_active_ae`,
      };
    }

    return next;
  });

  return { items: out, changes };
}
