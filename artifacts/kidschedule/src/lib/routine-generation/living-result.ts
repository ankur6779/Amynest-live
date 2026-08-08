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
  return "After you begin, you can skip, delay, or gently adjust any block — without rebuilding.";
}

/** R4 — Adjust this day (small correction) vs Rebuild (new plan). */
export function livingAdjustBandTitle(): string {
  return "Adjust this day";
}

export function livingAdjustBandHint(): string {
  return "Small changes that keep this plan — not a full rebuild.";
}

export function livingAdjustDetailsCta(): string {
  return "Change today's details";
}

export function livingAdjustDetailsHint(): string {
  return "Mood, caregiver, weather, school, or special plans — then rebuild if needed.";
}

export function livingAdjustPostBeginHint(): string {
  return "Skip, delay, and gentle edits unlock after you begin.";
}

export function livingExecutionHandoffNote(): string {
  return "Begin saves this plan and opens today's first step — ready to live.";
}

export function livingRevealCraftingLine(childName = "your child"): string {
  return `Bringing ${childName}'s plan…`;
}

export function livingRevealReadyEyebrow(): string {
  return "Here it is";
}

export function livingDetailStartHere(activity: string, time?: string): string {
  const when = time?.trim() ? ` · ${time.trim()}` : "";
  return `Start here${when}: ${activity.trim()}`;
}

export function livingDetailAdaptHint(): string {
  return "This plan can move with your day — skip, delay, or refresh what remains.";
}

export function livingRegenMenuLabel(): string {
  return "Fit the rest of today";
}

export function livingRegenRestTitle(): string {
  return "Refresh remaining day";
}

export function livingRegenRestDesc(): string {
  return "Keeps what you've finished — reshapes only what's left.";
}

export function livingRegenFullTitle(): string {
  return "Rebuild full day";
}

export function livingRegenFullDesc(): string {
  return "Returns to today's details and replaces the whole plan.";
}

export function livingRegenTriggerLabel(): string {
  return "Adjust day";
}

/**
 * Capability catalog for R4 honesty — PRESENT vs FUTURE.
 * Presentation/docs only; does not invent APIs.
 */
export const LIVING_ADAPT_CAPABILITIES = [
  {
    id: "begin_save",
    phase: "result" as const,
    status: "present" as const,
    action: "Begin today",
    capability: "Save plan and open execution",
    path: "POST /api/routines → /routines/:id?reveal=1",
  },
  {
    id: "change_details",
    phase: "result" as const,
    status: "present" as const,
    action: "Change today's details",
    capability: "Reopen generate deltas (mood/weather/etc.)",
    path: "Client form state — no API until rebuild",
  },
  {
    id: "rebuild_plan",
    phase: "result" as const,
    status: "present" as const,
    action: "Rebuild today's plan",
    capability: "Full regenerate with confirmation",
    path: "Existing generate-ai / generate client path",
  },
  {
    id: "fixed_review",
    phase: "result" as const,
    status: "present" as const,
    action: "Adjust weekly commitments",
    capability: "Fixed activities review + regenerate/save",
    path: "FixedActivitiesReviewPanel → generate/save",
  },
  {
    id: "skip_complete_delay",
    phase: "detail" as const,
    status: "present" as const,
    action: "Skip / complete / delay +15m",
    capability: "Item status updates with cascade",
    path: "PATCH /api/routines/:id/items",
  },
  {
    id: "inline_edit",
    phase: "detail" as const,
    status: "present" as const,
    action: "Edit activity / time / duration",
    capability: "Inline soft edit (customized=true)",
    path: "PATCH /api/routines/:id/items",
  },
  {
    id: "partial_regen",
    phase: "detail" as const,
    status: "present" as const,
    action: "Refresh remaining day",
    capability: "Partial regenerate from now",
    path: "POST /api/routines/:id/partial-regenerate",
  },
  {
    id: "feedback_write",
    phase: "detail" as const,
    status: "present" as const,
    action: "Activity / day feedback",
    capability: "Write-only signals (does not steer engine today)",
    path: "POST /api/routine-feedback",
  },
  {
    id: "presave_skip_swap",
    phase: "result" as const,
    status: "future" as const,
    action: "Skip / swap block before save",
    capability: "Requires routine id + PATCH before persist",
    path: "FUTURE",
  },
  {
    id: "feedback_to_engine",
    phase: "detail" as const,
    status: "future" as const,
    action: "Feedback shapes next generate",
    capability: "Feedback is write-only today",
    path: "FUTURE",
  },
] as const;

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
