import type { NotificationGoal } from "../outcomes/types.js";

export interface FamilyTimelineInput {
  childName: string;
  ageMonths?: number | null;
  /** Whole days until the child's next birthday (0 = today). */
  birthdayInDays?: number | null;
  /** Season bucket where known. */
  season?: string | null;
}

export type TimelineEventType =
  | "birthday_today"
  | "birthday_upcoming"
  | "age_transition"
  | "developmental_stage"
  | "seasonal"
  | "none";

export interface TimelineEvent {
  type: TimelineEventType;
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  /** Priority contribution 0–100 for the strategy layer. */
  priority: number;
}

/** Developmental stage boundaries in months → human stage name + focus. */
const STAGE_BOUNDARIES: Array<{ atMonths: number; stage: string; focus: string; deepLink: string }> = [
  { atMonths: 12, stage: "toddler", focus: "first words and steady routines", deepLink: "/routines" },
  { atMonths: 24, stage: "early talker", focus: "vocabulary and speech play", deepLink: "/speech" },
  { atMonths: 36, stage: "preschooler", focus: "phonics and early learning", deepLink: "/learning" },
  { atMonths: 48, stage: "pre-K", focus: "letters, numbers, and stories", deepLink: "/phonics" },
  { atMonths: 60, stage: "kindergartner", focus: "reading and structured routines", deepLink: "/learning" },
  { atMonths: 72, stage: "early reader", focus: "worksheets and independent reading", deepLink: "/worksheets" },
];

const AGE_TRANSITION_WINDOW_MONTHS = 1;

/**
 * Detect the most relevant family-lifecycle event and produce a contextual,
 * honest notification for it. Returns a `none` event when nothing is due, so
 * callers can safely skip. Never fabricates a milestone.
 */
export function detectTimelineEvent(input: FamilyTimelineInput): TimelineEvent {
  const name = safeName(input.childName);

  // Birthday is the highest-signal, most emotional moment.
  if (input.birthdayInDays === 0) {
    return {
      type: "birthday_today",
      title: `Happy birthday, ${name}! 🎉`,
      body: `Wishing ${name} a wonderful day. We've prepared something special to celebrate.`,
      deepLink: "/milestones?source=birthday",
      goal: "GOAL_PARENT_ENGAGEMENT",
      priority: 95,
    };
  }
  if (input.birthdayInDays != null && input.birthdayInDays > 0 && input.birthdayInDays <= 7) {
    return {
      type: "birthday_upcoming",
      title: `${name}'s birthday is coming up`,
      body: `${name} turns a year older in ${input.birthdayInDays} day${input.birthdayInDays === 1 ? "" : "s"} — a lovely time to look back on the progress.`,
      deepLink: "/milestones?source=birthday_week",
      goal: "GOAL_PARENT_ENGAGEMENT",
      priority: 72,
    };
  }

  // Age / developmental-stage transitions.
  if (input.ageMonths != null) {
    const boundary = STAGE_BOUNDARIES.find(
      (b) => Math.abs(input.ageMonths! - b.atMonths) <= AGE_TRANSITION_WINDOW_MONTHS,
    );
    if (boundary) {
      return {
        type: "age_transition",
        title: `${name} is entering a new stage`,
        body: `As a ${boundary.stage}, ${name} is ready for ${boundary.focus}. New activities just unlocked.`,
        deepLink: `${boundary.deepLink}?source=age_transition`,
        goal: "GOAL_LEARNING_COMPLETION",
        priority: 74,
      };
    }
  }

  return { type: "none", title: "", body: "", deepLink: "", goal: "GOAL_PARENT_ENGAGEMENT", priority: 0 };
}

function safeName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  return t.length > 0 ? t : "your child";
}
