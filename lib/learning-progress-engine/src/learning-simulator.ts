/**
 * Phase 7 — Synthetic learning simulator.
 *
 * Pure deterministic simulator that runs a virtual child through N days of
 * AmyNest usage so we can:
 *
 *  - catch progression drift
 *  - validate anti-spam under repeat taps
 *  - validate comeback flows after offline periods
 *  - validate mastery evolution + weak-skill recovery
 *
 * Has NO side effects. It composes existing engine functions in-memory.
 * Used in tests, internal QA scripts, and the debug page.
 */

import {
  buildLearningProfile,
  recordActivityCompletion,
} from "./index";
import { evaluateActivityIngest } from "./anti-spam";
import { buildLearningMemory } from "./learning-memory";
import { optimizeBehavior } from "./behavior-optimizer";
import type { SectionKey, LearningProgressProfile } from "./types";

export interface SimulatedDayPlan {
  /** Section the child practices this day. */
  section: SectionKey;
  /** Number of activities completed this day. */
  activities: number;
  /** Accuracy 0..1 — fraction marked correct. */
  accuracy: number;
  /** Whether the day is skipped (offline / inactive). */
  inactive?: boolean;
  /** Tries 3 duplicate taps on the same activity to test anti-spam. */
  spamAttempt?: boolean;
}

export interface SimulationOptions {
  childId: number;
  age: number;
  /** Start date ISO (YYYY-MM-DD). */
  startDateIso: string;
  /** Day plans — length determines how many days are simulated. */
  days: SimulatedDayPlan[];
}

export interface SimulationDayResult {
  dateIso: string;
  attempted: number;
  credited: number;
  diminished: number;
  ignored: number;
  masteryScore: number;
  streakDays: number;
  totalXP: number;
  behaviorReason: string;
}

export interface SimulationResult {
  finalProfile: LearningProgressProfile;
  days: SimulationDayResult[];
  totals: {
    attempted: number;
    credited: number;
    diminished: number;
    ignored: number;
  };
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Simulate a sequence of days. Deterministic given the same inputs.
 *
 * The simulator threads a small `recent` activity log through the
 * anti-spam evaluator and only applies `recordActivityCompletion` when
 * the decision is `credit` or `diminish`, mirroring server behavior.
 */
export function simulateLearningJourney(opts: SimulationOptions): SimulationResult {
  let profile = buildLearningProfile(opts.childId, {}, opts.age);
  const days: SimulationDayResult[] = [];
  const recent: { activityId: string; section: SectionKey; at: string; correct: boolean }[] =
    [];
  let totals = { attempted: 0, credited: 0, diminished: 0, ignored: 0 };

  for (let i = 0; i < opts.days.length; i++) {
    const plan = opts.days[i]!;
    const dateIso = addDays(opts.startDateIso, i);
    let attempted = 0;
    let credited = 0;
    let diminished = 0;
    let ignored = 0;

    if (plan.inactive) {
      days.push({
        dateIso,
        attempted: 0,
        credited: 0,
        diminished: 0,
        ignored: 0,
        masteryScore: profile.masteryScore,
        streakDays: profile.streakDays,
        totalXP: profile.totalXP,
        behaviorReason: "inactive_day",
      });
      continue;
    }

    const baseId = `${plan.section}_sim_d${i}`;
    const correctThreshold = Math.round(plan.accuracy * plan.activities);

    for (let a = 0; a < plan.activities; a++) {
      const activityId = plan.spamAttempt ? baseId : `${baseId}_${a}`;
      const correct = a < correctThreshold;
      const at = `${dateIso}T10:${String(a % 60).padStart(2, "0")}:00.000Z`;
      attempted += 1;
      totals.attempted += 1;

      const ingest = evaluateActivityIngest({
        activityId,
        section: plan.section,
        correct,
        nowIso: at,
        recent,
        profile,
      });

      if (ingest.decision === "ignore") {
        ignored += 1;
        totals.ignored += 1;
        continue;
      }
      if (ingest.decision === "diminish") {
        diminished += 1;
        totals.diminished += 1;
      } else {
        credited += 1;
        totals.credited += 1;
      }
      recent.push({ activityId, section: plan.section, at, correct });
      // Keep recent log bounded.
      if (recent.length > 64) recent.shift();

      const updates = recordActivityCompletion(profile, activityId, plan.section, correct, dateIso);
      profile = { ...profile, ...updates };
    }

    const memory = buildLearningMemory(profile, []);
    const behavior = optimizeBehavior({
      profile,
      memory,
      signals: { activitiesLast24h: attempted, sessionsLast7d: 1 },
    });

    days.push({
      dateIso,
      attempted,
      credited,
      diminished,
      ignored,
      masteryScore: profile.masteryScore,
      streakDays: profile.streakDays,
      totalXP: profile.totalXP,
      behaviorReason: behavior.reason,
    });
  }

  return { finalProfile: profile, days, totals };
}

/** Quick preset: 30 days of steady balanced practice. */
export function presetThirtyDaySteady(childId: number): SimulationOptions {
  const sections: SectionKey[] = [
    "phonics",
    "math",
    "speech",
    "stories",
    "puzzles",
  ];
  return {
    childId,
    age: 5,
    startDateIso: "2026-01-01",
    days: Array.from({ length: 30 }, (_, i) => ({
      section: sections[i % sections.length]!,
      activities: 4,
      accuracy: 0.75,
      inactive: i % 7 === 6,
    })),
  };
}
