export type FirstExperienceAgeBand = "0-2" | "2-4" | "5-7" | "8-10";

export type FirstExperienceStep =
  | "welcome"
  | "discovery-name"
  | "discovery-age"
  | "discovery-today"
  | "working"
  | "next-thing"
  | "doing"
  | "done"
  | "memory"
  | "keep"
  | "plan-home";

export type FirstExperienceTodayContext = "school" | "home" | "unsure";

/** Existing AmyNest surfaces a plan block can open — never invented. */
export type FirstExperiencePlanSurface = "routine" | "amy" | "activity" | "connection";

export type FirstExperiencePlanBlockKind =
  | "morning"
  | "transition"
  | "learning"
  | "play"
  | "movement"
  | "connection"
  | "hard_moment"
  | "bedtime"
  | "feeding"
  | "sleep";

export type FirstExperiencePlanBlock = {
  id: string;
  kind: FirstExperiencePlanBlockKind;
  label: string;
  title: string;
  detail: string;
  minutes: number;
  surface: FirstExperiencePlanSurface;
};

export type FirstExperienceNextThing = {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  basedOn: string[];
  /** 4–6 actionable blocks for today's mini-plan. */
  blocks: FirstExperiencePlanBlock[];
};

export type FirstExperienceCompletionKind = "done" | "similar" | "later";

export type FirstExperienceState = {
  version: 1;
  step: FirstExperienceStep;
  childName: string;
  ageBand: FirstExperienceAgeBand | null;
  todayContext: FirstExperienceTodayContext | null;
  nextThing: FirstExperienceNextThing | null;
  completedAt: string | null;
  valueEarned: boolean;
  /** How the parent closed the first success — never forced. */
  completionKind?: FirstExperienceCompletionKind | null;
  startedAt: string;
  /** Index of the block the parent started (guest first action). */
  activeBlockIndex?: number | null;
};
