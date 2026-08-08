/**
 * Routine Generation R2 — Entry + Context experience helpers.
 * Presentation / orchestration only. Engine, APIs, DB, RC, analytics contracts frozen.
 *
 * Emotional target: "Amy already understands enough. Let's build today's plan."
 * Never: Standard vs AI picker · planner wizard · patent/AI theatre · unlock FOMO.
 */

import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

import { getAgeGroup, getAgeGroupInfo, type AgeGroup } from "@/lib/age-groups";

export type RoutineLivingOpen = {
  eyebrow: string;
  title: string;
  companionship: string;
  purpose: string;
};

export type RoutineReadyMoment = {
  why: string;
  next: string;
  doNext: string;
};

export type RoutineContextChipId =
  | "rhythm"
  | "stage"
  | "focus"
  | "caregiver"
  | "weather"
  | "continuity";

/** Verified, human-readable context only — every chip must map to a real source. */
export type RoutineContextChip = {
  id: RoutineContextChipId;
  /** Screen-reader / UI category label */
  category: string;
  /** Short chip text */
  label: string;
  /** Full parent-facing statement */
  statement: string;
  /** Provenance for Founder review / trust audit */
  source: string;
  field: string;
};

export type BuildRoutineContextInput = {
  childName?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  goals?: string | null;
  parentGoals?: string | null;
  dateIso: string;
  hasSchool: boolean | null;
  schoolQuestionRequired: boolean;
  caregiver?: string | null;
  weatherOutdoor?: "yes" | "no" | "limited" | null;
  hasExistingRoutine?: boolean;
  priorRoutineCount?: number;
};

const CAREGIVER_LABELS: Record<string, string> = {
  mom: "Mom",
  dad: "Dad",
  both: "Both parents",
  grandparent: "Grandparent",
  babysitter: "Caregiver",
};

const WEATHER_LABELS: Record<"yes" | "no" | "limited", string> = {
  yes: "Outdoor-friendly",
  no: "Indoor day",
  limited: "Gentle outdoor time",
};

/** Living product face — place of life, not Generate SKU. */
export function livingRoutineProductName(): string {
  return isRoutineLivingV1Enabled() ? "Today's plan" : "Generate Routine";
}

export function livingRoutineBuildCta(override = false): string {
  return override ? "Rebuild today's plan" : "Build today's plan";
}

export function livingRoutineBuildSubtext(childName = "your child"): string {
  return `Amy uses what she already knows about ${childName}`;
}

export function livingRoutineLoadingHeadline(childName = "your child"): string {
  return `Shaping today around ${childName}…`;
}

export function livingRoutineLoadingBody(): string {
  return "Gathering what we already know, then placing meals, rest, and the day gently.";
}

export function livingRoutineLoadingSlowBody(): string {
  return "Taking a little longer — continuing with our trusted daily planner.";
}

/** Truthful handoff stages — mapped to real pipeline moments, never fake AI theatre. */
export const ROUTINE_HANDOFF_STAGES = [
  "Gathering what we already know",
  "Placing meals, rest, and school gently",
  "Fitting today’s weather and caregiver",
  "Checking the day still feels kind",
] as const;

export function routineLivingOpen(childName = "your child"): RoutineLivingOpen {
  return {
    eyebrow: "Today",
    title: `I'm here with ${childName} for today.`,
    companionship: `Amy already understands enough about ${childName}.`,
    purpose: "Let's build today's plan — nothing to configure.",
  };
}

export function routineReadyMoment(childName = "your child"): RoutineReadyMoment {
  return {
    why: `Amy already has ${childName}'s age, today's rhythm, and what you've shared.`,
    next: "Next, she'll shape a calm plan around school, rest, and meals.",
    doNext: "Tap Build today's plan. Change anything only if today is different.",
  };
}

function isWeekendIso(dateIso: string): boolean {
  const d = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function trimFocus(raw: string, max = 48): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

/**
 * Build only chips that can be traced to existing fields.
 * Never invent Discovery answers, scores, or engine metadata.
 */
export function buildRoutineContextChips(
  input: BuildRoutineContextInput,
): RoutineContextChip[] {
  const chips: RoutineContextChip[] = [];
  const name = (input.childName || "your child").trim() || "your child";
  const weekend = isWeekendIso(input.dateIso);

  // Today's rhythm — from date + hasSchool (profile / schoolDays auto-fill)
  if (input.hasSchool === true) {
    chips.push({
      id: "rhythm",
      category: "Today's rhythm",
      label: "School day",
      statement: `${name} has school on this day.`,
      source: "Generate form hasSchool (profile schoolDays / parent answer)",
      field: "hasSchool=true · child.schoolDays · schoolStartTime/schoolEndTime",
    });
  } else if (input.hasSchool === false && weekend) {
    chips.push({
      id: "rhythm",
      category: "Today's rhythm",
      label: "Weekend at home",
      statement: `A softer home day for ${name}.`,
      source: "date weekday + hasSchool=false",
      field: "date · hasSchool",
    });
  } else if (input.hasSchool === false) {
    chips.push({
      id: "rhythm",
      category: "Today's rhythm",
      label: input.schoolQuestionRequired ? "Day at home" : "Home day",
      statement: `${name} is home on this day — no school blocks.`,
      source: "hasSchool=false or age group without school",
      field: "hasSchool · age group · isSchoolGoing",
    });
  }

  // Child's current stage — age group from profile age
  if (typeof input.ageYears === "number" && Number.isFinite(input.ageYears)) {
    const group: AgeGroup = getAgeGroup(input.ageYears, input.ageMonths ?? 0);
    const info = getAgeGroupInfo(group);
    chips.push({
      id: "stage",
      category: "Child's current stage",
      label: info.label,
      statement: `${name} is in the ${info.label.toLowerCase()} stage.`,
      source: "Child profile age / ageMonths via getAgeGroup",
      field: "child.age · child.ageMonths",
    });
  }

  // Parent's chosen focus — goals from Discovery / profile (never invent)
  const focusRaw = (input.goals || input.parentGoals || "").trim();
  if (focusRaw) {
    const focus = trimFocus(focusRaw);
    chips.push({
      id: "focus",
      category: "Parent's chosen focus",
      label: focus,
      statement: `You're focusing on: ${focus}`,
      source: "Child profile goals (Discovery / edit child)",
      field: "child.goals · parentGoals",
    });
  }

  // Caregiver — handler selection (URL/default/last settings)
  const caregiverKey = (input.caregiver || "").trim().toLowerCase();
  if (caregiverKey && CAREGIVER_LABELS[caregiverKey]) {
    chips.push({
      id: "caregiver",
      category: "Who's with them",
      label: CAREGIVER_LABELS[caregiverKey],
      statement: `${CAREGIVER_LABELS[caregiverKey]} is with ${name} today.`,
      source: "Caregiver handler state (URL · last settings · default)",
      field: "caregiver / handlerType",
    });
  }

  // Weather — only if auto-detected or parent set
  if (input.weatherOutdoor && WEATHER_LABELS[input.weatherOutdoor]) {
    chips.push({
      id: "weather",
      category: "What matters today",
      label: WEATHER_LABELS[input.weatherOutdoor],
      statement: `Outdoor plan: ${WEATHER_LABELS[input.weatherOutdoor].toLowerCase()}.`,
      source: "weatherOutdoor (Open-Meteo auto or parent choice)",
      field: "weatherOutdoor",
    });
  }

  // Recent continuity — existing routine for date or prior history count
  if (input.hasExistingRoutine) {
    chips.push({
      id: "continuity",
      category: "Recent continuity",
      label: "Plan already exists",
      statement: `${name} already has a plan for this day — you can keep it or rebuild.`,
      source: "GET /api/routines/check exists flag",
      field: "existingRoutine.exists",
    });
  } else if (
    typeof input.priorRoutineCount === "number" &&
    input.priorRoutineCount > 0
  ) {
    chips.push({
      id: "continuity",
      category: "Recent continuity",
      label: "Building on your days",
      statement: "Amy can continue from the routines you've already lived.",
      source: "Prior routines list length (client cache)",
      field: "routines.length / priorRoutineCount",
    });
  }

  return chips;
}

/** True when engine-required inputs are present — zero extra questions. */
export function isRoutineContextSufficient(input: {
  childId?: string | null;
  dateIso?: string | null;
  schoolQuestionRequired: boolean;
  hasSchool: boolean | null;
}): boolean {
  if (!input.childId || !input.dateIso) return false;
  if (input.schoolQuestionRequired && input.hasSchool === null) return false;
  return true;
}

/** Flag — Routine Generation living entry manufacturing. Default ON. */
export function isRoutineLivingV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_ROUTINE_LIVING_V1);
}
