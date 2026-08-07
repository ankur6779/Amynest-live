/**
 * Today Home NRT resolver — Reuse Before Rewrite.
 * Composes routine next-item + continuity + decide-next. No new engines.
 */
import { buildDiscoveryNrtPreview } from "@/lib/child-discovery/nrt-preview";
import type { FirstExperienceContinuity } from "@/lib/first-experience/continuity";
import type {
  FirstExperienceNextThing,
  FirstExperienceTodayContext,
} from "@/lib/first-experience/types";
import { passesTodayHomeLaw } from "@/lib/amynest-philosophy";

export type TodayNrtSource =
  | "routine_next"
  | "continuity"
  | "decide_next"
  | "day_complete";

export type TodayNrtCtaKind = "begin_routine" | "generate" | "rest";

export type TodayNrtRoutineItem = {
  time: string;
  activity: string;
  duration?: number;
  status?: string;
  routineId: number;
};

export type TodayNrtChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  educationStage?: string | null;
};

export type TodayNrtDecision = {
  title: string;
  why: string;
  detail: string;
  minutes: number | null;
  source: TodayNrtSource;
  childName: string;
  childId: number | null;
  cta: {
    kind: TodayNrtCtaKind;
    label: string;
    routineId?: number;
  };
  basedOn: string[];
  lawPassed: boolean;
};

export type ResolveTodayNrtInput = {
  child: TodayNrtChild | null;
  todayRoutineItems: TodayNrtRoutineItem[];
  continuity: FirstExperienceContinuity | null;
  now?: Date;
  /** Soft parent goal code — reuse discovery adapter only. */
  focusGoal?: string | null;
};

function inferTodayContext(
  child: TodayNrtChild | null,
  continuity: FirstExperienceContinuity | null,
): FirstExperienceTodayContext {
  if (continuity?.todayContext) return continuity.todayContext;
  const stage = (child?.educationStage ?? "").toLowerCase();
  if (stage.includes("school") || stage === "daycare" || stage === "preschool") {
    return "school";
  }
  if (stage === "at_home" || stage.includes("home")) return "home";
  return "unsure";
}

function whyFromBasedOn(basedOn: string[], emotional?: string | null): string {
  const primary = basedOn.find((line) => line.trim().length > 0) ?? "Amy prepared today for this child.";
  if (emotional?.trim() && !primary.includes(emotional.trim())) {
    return `${emotional.trim()} ${primary}`;
  }
  return primary;
}

function nextIncompleteItem(
  items: TodayNrtRoutineItem[],
): TodayNrtRoutineItem | null {
  return items.find((item) => item.status !== "completed") ?? null;
}

function allComplete(items: TodayNrtRoutineItem[]): boolean {
  return items.length > 0 && items.every((item) => item.status === "completed");
}

/**
 * Resolve one product-decided next right thing for Home.
 * Priority: routine truth → Discovery/FE continuity → decide-next preview.
 */
export function resolveTodayNrt(input: ResolveTodayNrtInput): TodayNrtDecision {
  const childName = input.child?.name?.trim() || input.continuity?.childName?.trim() || "your child";
  const childId = input.child?.id ?? null;
  const items = input.todayRoutineItems;

  if (allComplete(items)) {
    const decision: TodayNrtDecision = {
      title: `${childName}'s day is complete`,
      why: "Today’s plan was followed. Rest is the next right thing.",
      detail: "No more tasks to chase. Soft landing is enough.",
      minutes: null,
      source: "day_complete",
      childName,
      childId,
      cta: { kind: "rest", label: "Rest for now" },
      basedOn: ["Today’s plan is complete."],
      lawPassed: false,
    };
    decision.lawPassed = passesTodayHomeLaw({
      parentMustDecideWhatToDoNext: false,
      productDecidesWhatToDoNext: true,
    }).passed;
    return decision;
  }

  const nextItem = nextIncompleteItem(items);
  if (nextItem) {
    const minutes = typeof nextItem.duration === "number" ? nextItem.duration : null;
    const basedOn = [
      nextItem.time ? `Next at ${nextItem.time}.` : "Next on today’s plan.",
      `${childName} already has a plan for today.`,
    ];
    const decision: TodayNrtDecision = {
      title: nextItem.activity,
      why: whyFromBasedOn(basedOn, input.continuity?.emotionalContext),
      detail: minutes != null ? `About ${minutes} minutes — begin when you are ready.` : "Begin when you are ready.",
      minutes,
      source: "routine_next",
      childName,
      childId,
      cta: {
        kind: "begin_routine",
        label: "Begin",
        routineId: nextItem.routineId,
      },
      basedOn,
      lawPassed: false,
    };
    decision.lawPassed = passesTodayHomeLaw({
      parentMustDecideWhatToDoNext: false,
      productDecidesWhatToDoNext: true,
    }).passed;
    return decision;
  }

  const continuityThing = input.continuity?.nextThing ?? null;
  const continuityMatchesChild =
    !input.child?.name ||
    !input.continuity?.childName ||
    input.continuity.childName.trim().toLowerCase() === childName.toLowerCase() ||
    input.continuity.childName === "your child";

  if (continuityThing && continuityMatchesChild) {
    return fromNextThing({
      thing: continuityThing,
      childName,
      childId,
      source: "continuity",
      emotional: input.continuity?.emotionalContext,
      ctaKind: "generate",
      ctaLabel: "Begin",
    });
  }

  if (input.child?.name && input.child.name !== "your child") {
    const preview = buildDiscoveryNrtPreview({
      childName: input.child.name,
      ageYears: input.child.age,
      ageMonths: input.child.ageMonths ?? 0,
      todayContext: inferTodayContext(input.child, input.continuity),
      focusGoal: input.focusGoal,
      now: input.now,
    });
    if (preview) {
      return fromNextThing({
        thing: preview,
        childName,
        childId,
        source: "decide_next",
        emotional: input.continuity?.emotionalContext,
        ctaKind: "generate",
        ctaLabel: "Begin",
      });
    }
  }

  // Last resort — still decide for the parent (never a menu).
  const fallback: TodayNrtDecision = {
    title: childName !== "your child" ? `Prepare ${childName}'s day` : "Prepare today’s plan",
    why: "Amy needs a clear day plan before the next right step can open.",
    detail: "One gentle plan for meals, rest, play, and bedtime — shaped around your child.",
    minutes: null,
    source: "decide_next",
    childName,
    childId,
    cta: { kind: "generate", label: "Begin" },
    basedOn: ["A clear day comes first."],
    lawPassed: false,
  };
  fallback.lawPassed = passesTodayHomeLaw({
    parentMustDecideWhatToDoNext: false,
    productDecidesWhatToDoNext: true,
  }).passed;
  return fallback;
}

function fromNextThing(opts: {
  thing: FirstExperienceNextThing;
  childName: string;
  childId: number | null;
  source: TodayNrtSource;
  emotional?: string | null;
  ctaKind: TodayNrtCtaKind;
  ctaLabel: string;
}): TodayNrtDecision {
  const decision: TodayNrtDecision = {
    title: opts.thing.title,
    why: whyFromBasedOn(opts.thing.basedOn, opts.emotional),
    detail: opts.thing.detail,
    minutes: opts.thing.minutes,
    source: opts.source,
    childName: opts.childName,
    childId: opts.childId,
    cta: { kind: opts.ctaKind, label: opts.ctaLabel },
    basedOn: opts.thing.basedOn,
    lawPassed: false,
  };
  decision.lawPassed = passesTodayHomeLaw({
    parentMustDecideWhatToDoNext: false,
    productDecidesWhatToDoNext: true,
  }).passed;
  return decision;
}
