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
  | "keep";

export type FirstExperienceTodayContext = "school" | "home" | "unsure";

export type FirstExperienceNextThing = {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  basedOn: string[];
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
};
