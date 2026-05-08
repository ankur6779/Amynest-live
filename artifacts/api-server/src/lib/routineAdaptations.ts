/**
 * Adaptive Family Intelligence — adaptation strings.
 *
 * Pure, deterministic helper that converts the inputs that drove a routine
 * generation (goals, energy profile, previous-day context, calendar context)
 * into a small list of human-readable strings shown in the
 * "Why this routine?" card on web + mobile.
 *
 * Kept i18n-free on the server: the UI re-keys these to translatable strings
 * by matching the leading code prefix (e.g. "goal:improve_sleep").
 *
 * Strings have a stable prefix ("code: ") so the front-end can both:
 *   - render the raw string as a fallback, and
 *   - swap to a translated message keyed by the prefix.
 */

import type { ParentGoalCode, EnergyProfile } from "../services/childIntelligenceService.js";

export type AdaptationContext = {
  parentGoals: readonly ParentGoalCode[];
  energyProfile: EnergyProfile | null;
  previousDayContext?: {
    sleepQuality?: "good" | "poor" | "average";
    moodScore?: "happy" | "tired" | "cranky" | "normal";
    activityCompletion?: number;
  };
  hasSchool: boolean;
  isWeekendDay: boolean;
};

const GOAL_LABEL: Record<ParentGoalCode, string> = {
  improve_sleep: "improve sleep",
  reduce_tantrums: "reduce tantrums",
  improve_focus: "improve focus",
  reduce_screen_time: "reduce screen time",
  increase_independence: "increase independence",
};

const GOAL_ADAPTATION: Record<ParentGoalCode, string> = {
  improve_sleep:
    "Goal: improve sleep — extended the wind-down block before bed and trimmed late-evening stimulation.",
  reduce_tantrums:
    "Goal: reduce tantrums — softened transitions and added a calm-down block in the low-energy window.",
  improve_focus:
    "Goal: improve focus — anchored the main learning block inside the peak focus window.",
  reduce_screen_time:
    "Goal: reduce screen time — replaced any screen-leaning blocks with active or creative play.",
  increase_independence:
    "Goal: increase independence — added self-care steps the child can do on their own.",
};

export function buildAdaptations(ctx: AdaptationContext): string[] {
  const out: string[] = [];

  // ── Previous-day context ────────────────────────────────────────────────
  if (ctx.previousDayContext?.sleepQuality === "poor") {
    out.push("Reduced morning load — yesterday's sleep was shorter than usual.");
  } else if (ctx.previousDayContext?.sleepQuality === "good") {
    out.push("Kept the schedule lively — yesterday's sleep was great, your child is well-rested.");
  }

  if (ctx.previousDayContext?.moodScore === "cranky" || ctx.previousDayContext?.moodScore === "tired") {
    out.push("Added an extra calm block — yesterday's mood was off; today leans gentler.");
  }

  const completion = ctx.previousDayContext?.activityCompletion;
  if (typeof completion === "number") {
    if (completion < 50) {
      out.push(`Trimmed the schedule — only ${Math.round(completion)}% of yesterday's plan got done.`);
    } else if (completion >= 80) {
      out.push(`Kept the same density — ${Math.round(completion)}% of yesterday was completed.`);
    }
  }

  // ── Energy profile ──────────────────────────────────────────────────────
  const ep = ctx.energyProfile;
  if (ep && ep.sampleCount >= 3) {
    if (ep.peakFocusStart && ep.peakFocusEnd) {
      out.push(`Anchored learning around your child's peak focus window (${ep.peakFocusStart}–${ep.peakFocusEnd}).`);
    }
    if (ep.lowEnergyStart && ep.lowEnergyEnd) {
      out.push(`Placed calmer activities in the low-energy window (${ep.lowEnergyStart}–${ep.lowEnergyEnd}).`);
    }
  } else if (ep && ep.sampleCount > 0) {
    out.push("Energy profile is still learning — log a few more daily signals to unlock peak-focus anchoring.");
  }

  // ── Parent goals ────────────────────────────────────────────────────────
  for (const g of ctx.parentGoals) {
    out.push(GOAL_ADAPTATION[g]);
  }

  // ── Calendar context ────────────────────────────────────────────────────
  if (ctx.isWeekendDay) {
    out.push("Weekend mode — relaxed timings and extra family bonding.");
  } else if (ctx.hasSchool) {
    out.push("School day — activities planned around your child's school hours.");
  }

  return out;
}

/** Exposed for tests / future locale-keyed UI. */
export function goalLabel(code: ParentGoalCode): string {
  return GOAL_LABEL[code];
}
