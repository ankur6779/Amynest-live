/**
 * Routine Generation R3 — Living result / day-plan helpers.
 * Presentation only. Engine, APIs, DB, RC, analytics contracts frozen.
 * R2 entry helpers remain untouched.
 *
 * Emotional target: "Amy shaped this child's day."
 * Never: AI output theatre · planner dashboard · generic praise · invented flexibility.
 */

import { parseRoutineTimeToMinutes } from "@/lib/routine-timeline-ui";
import { buildRevealHighlightChips } from "@/lib/routine-detail-premium";
import { isRoutineLivingV1Enabled } from "@/lib/routine-generation/living-entry";

export type LivingResultItem = {
  time: string;
  activity: string;
  duration?: number;
  category?: string;
  status?: string;
  notes?: string;
};

export type LivingArcSectionId = "morning" | "day" | "evening";

export type LivingArcSection = {
  id: LivingArcSectionId;
  label: string;
  items: LivingResultItem[];
};

export type LivingFirstAction = {
  time: string;
  activity: string;
  duration?: number;
  category?: string;
  index: number;
};

export type LivingWhyProof = {
  id: string;
  statement: string;
  source: string;
  field: string;
};

export type LivingResultOpen = {
  eyebrow: string;
  title: string;
  companionship: string;
  arrival: string;
};

const MORNING_END = 12 * 60;
const DAY_END = 17 * 60;

const SECTION_LABELS: Record<LivingArcSectionId, string> = {
  morning: "Morning",
  day: "Day",
  evening: "Evening",
};

export function livingResultOpen(childName = "your child"): LivingResultOpen {
  return {
    eyebrow: "Today's plan",
    title: `Here's the day Amy shaped for ${childName}.`,
    companionship: `A calm plan for ${childName} — ready when you are.`,
    arrival: "Here it is.",
  };
}

export function livingResultBeginCta(): string {
  return "Begin today";
}

export function livingResultBeginSubtext(): string {
  return "Save this plan and start the first right step";
}

export function livingResultRebuildCta(): string {
  return "Rebuild today's plan";
}

export function livingResultRebuildConfirm(): string {
  return "This replaces the plan you just saw. Adjust mood or details first if something is different — then rebuild.";
}

export function livingResultSoftEditNote(): string {
  return "After you begin, you can skip or gently adjust any block.";
}

export function livingResultEmptyTitle(): string {
  return "Amy couldn't shape today's plan yet";
}

export function livingResultEmptyBody(): string {
  return "Nothing to show from this attempt. Try again, or return and check today's details.";
}

export function livingResultFallbackNote(): string {
  return "Built with our trusted daily planner.";
}

export function livingResultPartialNote(count: number): string {
  if (count <= 0) return livingResultEmptyBody();
  return `A shorter plan with ${count} step${count === 1 ? "" : "s"} — review before you begin.`;
}

/** First meaningful action — first non-completed / non-skipped block. */
export function pickLivingFirstAction(
  items: readonly LivingResultItem[],
): LivingFirstAction | null {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it?.activity?.trim()) continue;
    if (it.status === "completed" || it.status === "skipped") continue;
    return {
      time: it.time,
      activity: it.activity.trim(),
      duration: it.duration,
      category: it.category,
      index: i,
    };
  }
  return null;
}

function sectionForMins(mins: number): LivingArcSectionId {
  if (mins >= 0 && mins < MORNING_END) return "morning";
  if (mins >= MORNING_END && mins < DAY_END) return "day";
  return "evening";
}

/**
 * Group engine items into a living day arc.
 * Faithful to existing item times — does not invent flexibility.
 */
export function buildLivingDayArc(
  items: readonly LivingResultItem[],
): LivingArcSection[] {
  const buckets: Record<LivingArcSectionId, LivingResultItem[]> = {
    morning: [],
    day: [],
    evening: [],
  };

  for (const it of items) {
    if (!it?.activity?.trim()) continue;
    const mins = parseRoutineTimeToMinutes(it.time);
    const id = mins < 0 ? "day" : sectionForMins(mins);
    buckets[id].push(it);
  }

  return (["morning", "day", "evening"] as const)
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({
      id,
      label: SECTION_LABELS[id],
      items: buckets[id],
    }));
}

/**
 * WHY proof — only from adaptations[] + known form context.
 * Never invents praise or model reasoning.
 */
export function buildLivingWhyProof(input: {
  adaptations?: readonly string[] | null;
  childName?: string | null;
  hasSchool?: boolean | null;
  isWeekendDay?: boolean;
  mood?: string | null;
  weatherOutdoor?: "yes" | "no" | "limited" | null;
  caregiver?: string | null;
  goals?: string | null;
  fixedHonored?: boolean;
  max?: number;
}): LivingWhyProof[] {
  const max = input.max ?? 4;
  const proofs: LivingWhyProof[] = [];
  const name = (input.childName || "your child").trim() || "your child";

  const chips = buildRevealHighlightChips(input.adaptations, 3);
  for (let i = 0; i < chips.length; i++) {
    proofs.push({
      id: `adaptation-${i}`,
      statement: chips[i],
      source: "Engine adaptations[] (parent-safe strings)",
      field: "routine.adaptations",
    });
  }

  if (proofs.length < max && input.hasSchool === true) {
    proofs.push({
      id: "school",
      statement: `Shaped around ${name}'s school day.`,
      source: "Generate form hasSchool",
      field: "hasSchool=true",
    });
  } else if (proofs.length < max && input.hasSchool === false && input.isWeekendDay) {
    proofs.push({
      id: "weekend",
      statement: `A softer home rhythm for the weekend.`,
      source: "date weekday + hasSchool=false",
      field: "date · hasSchool",
    });
  }

  if (
    proofs.length < max &&
    input.mood &&
    input.mood !== "normal"
  ) {
    proofs.push({
      id: "mood",
      statement: `Paced for a ${input.mood} day.`,
      source: "Parent mood selection on generate",
      field: "mood",
    });
  }

  if (proofs.length < max && input.weatherOutdoor === "no") {
    proofs.push({
      id: "weather",
      statement: "Kept gently indoors today.",
      source: "weatherOutdoor choice / auto-detect",
      field: "weatherOutdoor=no",
    });
  } else if (proofs.length < max && input.weatherOutdoor === "limited") {
    proofs.push({
      id: "weather",
      statement: "Outdoor time kept gentle.",
      source: "weatherOutdoor choice / auto-detect",
      field: "weatherOutdoor=limited",
    });
  }

  if (proofs.length < max && input.fixedHonored) {
    proofs.push({
      id: "fixed",
      statement: "Weekly commitments were honored.",
      source: "fixedActivitiesResult.fixedActivitiesApplied",
      field: "fixedActivitiesResult",
    });
  }

  const goal = (input.goals || "").trim();
  if (proofs.length < max && goal) {
    const short = goal.length > 40 ? `${goal.slice(0, 39)}…` : goal;
    proofs.push({
      id: "goals",
      statement: `Held your focus: ${short}`,
      source: "Child profile goals",
      field: "child.goals",
    });
  }

  return proofs.slice(0, max);
}

export function livingResultWhatLine(
  childName: string,
  itemCount: number,
  dateLabel?: string,
): string {
  const when = dateLabel ? ` · ${dateLabel}` : "";
  if (itemCount <= 0) {
    return `Today's plan for ${childName}${when}`;
  }
  return `Today's plan for ${childName}${when} · ${itemCount} gentle step${itemCount === 1 ? "" : "s"}`;
}

/** Same living flag as R2 — single rollback surface. */
export function isRoutineLivingResultEnabled(): boolean {
  return isRoutineLivingV1Enabled();
}
