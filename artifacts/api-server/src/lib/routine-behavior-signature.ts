/**
 * Child Behavior Signature — adjusts durations and pre-schedule ordering only.
 * Never touches wake/sleep, school, or pinned meal anchors.
 */
import type { AgeGroup } from "./routine-templates.js";
import type { ChildProfileForRoutine, PreviousDayContext } from "./routine-context-engine.js";
import {
  clampDurationForCategory,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

export type EnergyPattern = "morning" | "afternoon" | "evening";
export type ActivityTolerance = "low" | "medium" | "high";

export type ChildBehaviorSignature = {
  focusSpan: number;
  energyPattern: EnergyPattern;
  activityTolerance: ActivityTolerance;
  complianceScore: number;
};

export type ActivityHistoryEntry = {
  activity: string;
  category: string;
  completed: boolean;
  skipped: boolean;
};

export type RoutineActivityHistory = {
  entries: ActivityHistoryEntry[];
  previousDayContext?: PreviousDayContext;
};

const STUDY_CATS = new Set(["study", "school"]);
const PLAY_CATS = new Set(["play", "outdoor", "creative", "exercise", "activity"]);

function isPinnedItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "sleep" || cat === "school" || cat === "meal" || cat === "tiffin") {
    return true;
  }
  if (/\b(breakfast|lunch|dinner|tiffin|wake|sleep|bedtime|lights out)\b/i.test(item.activity)) {
    return true;
  }
  return false;
}

function focusSpanForAge(ageGroup: AgeGroup): number {
  switch (ageGroup) {
    case "infant":
    case "toddler":
      return 15;
    case "preschool":
      return 25;
    case "early_school":
      return 35;
    case "pre_teen":
      return 45;
    default:
      return 40;
  }
}

function deriveEnergyPattern(
  history: RoutineActivityHistory,
): EnergyPattern {
  const peak = history.previousDayContext?.moodScore;
  if (peak === "happy") return "afternoon";
  if (peak === "tired") return "morning";
  return "afternoon";
}

function deriveCompliance(history: RoutineActivityHistory): number {
  if (history.previousDayContext?.activityCompletion != null) {
    return Math.max(0, Math.min(1, history.previousDayContext.activityCompletion / 100));
  }
  const entries = history.entries;
  if (entries.length === 0) return 0.65;
  const done = entries.filter((e) => e.completed && !e.skipped).length;
  const skipped = entries.filter((e) => e.skipped).length;
  const total = entries.length;
  return Math.max(0, Math.min(1, (done - skipped * 0.5) / total));
}

function deriveTolerance(
  compliance: number,
  history: RoutineActivityHistory,
): ActivityTolerance {
  if (compliance < 0.45) return "low";
  if (compliance > 0.8) return "high";
  const sleep = history.previousDayContext?.sleepQuality;
  if (sleep === "poor") return "low";
  if (sleep === "good") return "high";
  return "medium";
}

/**
 * Derives a stable behavior signature from profile + optional history.
 */
export function deriveChildBehaviorSignature(
  childProfile: ChildProfileForRoutine,
  history: RoutineActivityHistory = { entries: [] },
): ChildBehaviorSignature {
  let focusSpan = focusSpanForAge(childProfile.ageGroup);
  const complianceScore = deriveCompliance(history);

  if (complianceScore < 0.5) {
    focusSpan = Math.max(15, Math.round(focusSpan * 0.85));
  } else if (complianceScore > 0.85) {
    focusSpan = Math.min(60, Math.round(focusSpan * 1.1));
  }

  return {
    focusSpan,
    energyPattern: deriveEnergyPattern(history),
    activityTolerance: deriveTolerance(complianceScore, history),
    complianceScore,
  };
}

function periodOrder(pattern: EnergyPattern): Record<string, number> {
  if (pattern === "morning") {
    return { study: 0, play: 1, meal: 2, other: 3 };
  }
  if (pattern === "evening") {
    return { play: 0, study: 1, meal: 2, other: 3 };
  }
  return { study: 0, play: 1, meal: 2, other: 3 };
}

/**
 * Applies signature to durations and pre-schedule ordering only.
 */
export function applyBehaviorSignatureToItems(
  items: RoutineScheduleItem[],
  signature: ChildBehaviorSignature,
): RoutineScheduleItem[] {
  const order = periodOrder(signature.energyPattern);
  const groupOf = (it: RoutineScheduleItem): string => {
    const c = (it.category ?? "").toLowerCase();
    if (STUDY_CATS.has(c)) return "study";
    if (PLAY_CATS.has(c)) return "play";
    if (c === "meal" || c === "tiffin") return "meal";
    return "other";
  };

  const adjustable = items.filter((it) => !isPinnedItem(it));
  const pinned = items.filter(isPinnedItem);

  const adjusted = adjustable.map((item) => {
    const cat = (item.category ?? "").toLowerCase();
    let duration = item.duration ?? 30;

    if (STUDY_CATS.has(cat)) {
      duration = Math.min(duration, signature.focusSpan);
      if (signature.activityTolerance === "low") {
        duration = Math.max(20, Math.round(duration * 0.9));
      }
      duration = clampDurationForCategory(cat, duration);
    } else if (PLAY_CATS.has(cat)) {
      if (signature.activityTolerance === "low") {
        duration = clampDurationForCategory(cat, Math.round(duration * 0.9));
      } else if (signature.activityTolerance === "high") {
        duration = clampDurationForCategory(cat, Math.round(duration * 1.05));
      }
    }

    return { ...item, duration };
  });

  const sorted = [...adjusted].sort(
    (a, b) => (order[groupOf(a)] ?? 9) - (order[groupOf(b)] ?? 9),
  );

  let result = [...pinned, ...sorted];

  if (signature.complianceScore < 0.45) {
    const hasBreak = result.some(
      (i) =>
        (i.category ?? "").toLowerCase() === "rest" ||
        /break|free time/i.test(i.activity),
    );
    if (!hasBreak) {
      result = [
        ...result,
        {
          time: "15:00",
          activity: "Short break",
          duration: 15,
          category: "rest",
          notes: "Extra break — yesterday's completion was low.",
          status: "pending" as const,
        },
      ];
    }
  }

  return result;
}
