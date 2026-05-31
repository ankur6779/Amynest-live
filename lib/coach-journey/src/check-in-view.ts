import { coachGoalCategoryId } from "./catalog.js";
import {
  buildFamilyReferenceLine,
  type CoachIntelligenceSnapshot,
} from "./coaching-intelligence.js";
import {
  type CoachFeedback,
  type CoachFeedbackRow,
  type CoachProgressViewModel,
  computeProgressTrend,
} from "./progress-view.js";

export type CoachCheckInKind =
  | "daily_24h"
  | "inactivity_3d"
  | "momentum"
  | "stalled"
  | "maintenance"
  | "micro";

export interface CoachCheckInOption {
  id: string;
  label: string;
}

export interface CoachCheckInViewModel {
  kind: CoachCheckInKind;
  title: string;
  prompt: string;
  memoryLine?: string;
  options: CoachCheckInOption[];
  goalId: string;
  goalTitle: string;
  sessionId: string;
  currentFocus?: string;
  clarificationQuestion?: string;
  clarificationOptions?: CoachCheckInOption[];
}

export interface CoachCheckInHistoryEntry {
  sessionId: string;
  goalId: string;
  kind: CoachCheckInKind;
  optionId: string;
  optionLabel: string;
  at: string;
  clarificationAnswer?: string;
}

export interface CoachCheckInResolveInput {
  session: CoachProgressViewModel;
  lastActivityAt: string | null;
  lastCheckInAt: string | null;
  snoozedUntil: string | null;
  maintenanceMode?: boolean;
  checkInHistory: CoachCheckInHistoryEntry[];
  intelligence?: CoachIntelligenceSnapshot | null;
  now?: Date;
}

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export function hoursSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return ms / MS_HOUR;
}

function recentNotYetCount(feedbacks: CoachFeedbackRow[]): number {
  return [...feedbacks]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 3)
    .filter((f) => f.feedback === "no").length;
}

function isProgressPlateau(session: CoachProgressViewModel, feedbacks: CoachFeedbackRow[]): boolean {
  if (session.progressPct < 20 || session.progressPct >= 85) return false;
  const recent = [...feedbacks]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);
  if (recent.length < 3) return false;
  const yes = recent.filter((f) => f.feedback === "yes").length;
  const somewhat = recent.filter((f) => f.feedback === "somewhat").length;
  return yes <= 1 && somewhat >= 2;
}

function microPromptForGoal(goalId: string, goalTitle: string): string {
  const categoryId = coachGoalCategoryId(goalId) ?? "";
  if (categoryId === "sleep" || goalId.includes("bedtime") || goalId.includes("sleep")) {
    return "Did bedtime feel easier this week?";
  }
  if (categoryId === "special-situations" || goalId.includes("travel")) {
    return "Did travel feel a little calmer this week?";
  }
  if (categoryId === "for-you") {
    return "Did you find a moment to recover this week?";
  }
  return `Did ${goalTitle.toLowerCase()} feel any easier this week?`;
}

function clarificationForGoal(goalId: string): { question: string; options: CoachCheckInOption[] } {
  const categoryId = coachGoalCategoryId(goalId) ?? "behavior";
  if (categoryId === "sleep") {
    return {
      question: "What's been hardest at bedtime lately?",
      options: [
        { id: "timing", label: "Timing keeps shifting" },
        { id: "resistance", label: "More resistance at lights-out" },
        { id: "screens", label: "Screens are getting in the way" },
        { id: "parent_stress", label: "I'm more stressed than usual" },
      ],
    };
  }
  if (categoryId === "special-situations") {
    return {
      question: "What's been hardest during travel lately?",
      options: [
        { id: "transitions", label: "Transitions between activities" },
        { id: "long_stretches", label: "Long stretches in the car or plane" },
        { id: "overstimulation", label: "Too much stimulation" },
        { id: "parent_stress", label: "I'm more stressed than usual" },
      ],
    };
  }
  return {
    question: "What's been hardest with this challenge lately?",
    options: [
      { id: "transitions", label: "Transitions or changes in routine" },
      { id: "intensity", label: "Moments feel more intense" },
      { id: "consistency", label: "Hard to stay consistent" },
      { id: "parent_stress", label: "I'm more stressed than usual" },
    ],
  };
}

export function buildCoachMemoryLine(
  history: CoachCheckInHistoryEntry[],
  session: CoachProgressViewModel,
  intelligence?: CoachIntelligenceSnapshot | null,
): string | undefined {
  if (intelligence) {
    const familyRef = buildFamilyReferenceLine(intelligence, session.goalId);
    if (familyRef) return familyRef;

    const intelCheckIn = intelligence.checkInSummaries.find((c) => c.goalId === session.goalId);
    if (intelCheckIn?.positive) {
      return `You recently shared that ${session.goalLabel.toLowerCase()} felt a bit better.`;
    }
    if (intelCheckIn && !intelCheckIn.positive) {
      return "Amy is keeping an eye on what's been harder lately.";
    }
  }

  const forSession = history
    .filter((h) => h.sessionId === session.sessionId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const last = forSession[0];
  if (!last) {
    if (session.progressTrend === "improving" || session.progressTrend === "strong_momentum") {
      return "Your recent coaching feedback suggests things are moving in the right direction.";
    }
    return undefined;
  }

  const positiveIds = new Set([
    "better",
    "yes",
    "still_well",
    "a_little",
    "keep_pace",
    "mixed",
  ]);
  const negativeIds = new Set(["not_yet", "didnt_try", "challenges_return", "need_help", "different"]);

  if (positiveIds.has(last.optionId)) {
    if (session.goalId.includes("travel")) {
      return "Last week you reported travel felt a little calmer.";
    }
    if (session.goalId.includes("bedtime") || session.goalId.includes("sleep")) {
      return "You mentioned bedtime has been improving.";
    }
    return `You recently shared that ${session.goalLabel.toLowerCase()} felt better than before.`;
  }
  if (negativeIds.has(last.optionId)) {
    return "Amy is keeping an eye on what's been harder lately.";
  }
  return undefined;
}

export function resolveCoachCheckIn(input: CoachCheckInResolveInput): CoachCheckInViewModel | null {
  const now = input.now ?? new Date();
  if (input.snoozedUntil && new Date(input.snoozedUntil).getTime() > now.getTime()) {
    return null;
  }

  const { session } = input;
  const feedbacks = session.recentOutcomes.map((o, i) => ({
    win: i + 1,
    feedback: o.feedback,
    at: o.at,
  }));
  const trend = computeProgressTrend(feedbacks);
  const inactiveHours = hoursSince(input.lastActivityAt, now) ?? 999;
  const sinceCheckInHours = hoursSince(input.lastCheckInAt, now);
  const memoryLine = buildCoachMemoryLine(input.checkInHistory, session, input.intelligence);
  const goalTitle = session.planTitle;
  const focus = session.currentFocus?.title ?? session.currentFocus?.summary;

  const base = {
    goalId: session.goalId,
    goalTitle,
    sessionId: session.sessionId,
    currentFocus: focus,
    memoryLine,
  };

  if (input.maintenanceMode || session.progressPct >= 100) {
    if (sinceCheckInHours !== null && sinceCheckInHours < 48) return null;
    return {
      ...base,
      kind: "maintenance",
      title: "Amy Check-In",
      prompt: "How are things going lately?",
      options: [
        { id: "still_well", label: "Still going well" },
        { id: "challenges_return", label: "Some challenges returning" },
        { id: "need_help", label: "Need help again" },
      ],
    };
  }

  if (inactiveHours >= 72) {
    return {
      ...base,
      kind: "inactivity_3d",
      title: "Amy Check-In",
      prompt: `It's been a few days since we worked on ${goalTitle}.\n\nWould you like a quick refresher or a new approach?`,
      options: [
        { id: "refresher", label: "Quick refresher" },
        { id: "different", label: "Try a different strategy" },
        { id: "snooze", label: "Not right now" },
      ],
    };
  }

  const notYetRecent = recentNotYetCount(feedbacks);
  const stalled =
    trend === "needs_attention" ||
    notYetRecent >= 2 ||
    isProgressPlateau(session, feedbacks);

  if (stalled && (sinceCheckInHours === null || sinceCheckInHours >= 12)) {
    const clar = clarificationForGoal(session.goalId);
    return {
      ...base,
      kind: "stalled",
      title: "Amy Check-In",
      prompt: "It looks like this challenge may need a different approach.",
      options: [{ id: "clarify", label: "Can I ask one quick question?" }],
      clarificationQuestion: clar.question,
      clarificationOptions: clar.options,
    };
  }

  if (
    (trend === "strong_momentum" || trend === "improving" || session.coachingStreakDays >= 3) &&
    session.progressPct < 100 &&
    (sinceCheckInHours === null || sinceCheckInHours >= 24)
  ) {
    return {
      ...base,
      kind: "momentum",
      title: "Amy Check-In",
      prompt: "You're building strong consistency.\n\nWould you like a slightly more advanced coaching win?",
      options: [
        { id: "advanced", label: "Yes" },
        { id: "keep_pace", label: "Keep current pace" },
      ],
    };
  }

  if (inactiveHours >= 24 && (sinceCheckInHours === null || sinceCheckInHours >= 20)) {
    return {
      ...base,
      kind: "daily_24h",
      title: "Amy Check-In",
      prompt: "How did yesterday's strategy go?",
      options: [
        { id: "better", label: "😊 Better than expected" },
        { id: "mixed", label: "😐 Mixed results" },
        { id: "didnt_try", label: "😕 Didn't get a chance to try" },
      ],
    };
  }

  if (sinceCheckInHours !== null && sinceCheckInHours < 18) return null;

  return {
    ...base,
    kind: "micro",
    title: "Amy Check-In",
    prompt: microPromptForGoal(session.goalId, goalTitle),
    options: [
      { id: "yes", label: "Yes" },
      { id: "a_little", label: "A little" },
      { id: "not_yet", label: "Not yet" },
    ],
  };
}

export function coachCheckInNotificationCopy(input: {
  kind: CoachCheckInKind;
  goalTitle: string;
}): { title: string; body: string } {
  switch (input.kind) {
    case "inactivity_3d":
      return {
        title: "Amy has a quick thought for you",
        body: `Small progress still matters for ${input.goalTitle}. Ready for a quick check-in?`,
      };
    case "momentum":
      return {
        title: "Small progress matters",
        body: "You're building consistency — Amy has a quick coaching step when you're ready.",
      };
    case "maintenance":
      return {
        title: "Amy has a quick thought for you",
        body: `How is ${input.goalTitle} going lately? One tap to let Amy know.`,
      };
    default:
      return {
        title: "Ready for your next coaching step?",
        body: "Amy has a quick check-in — one tap, no long forms.",
      };
  }
}

export function mapCheckInResponseToTrend(optionId: string): CoachFeedback | null {
  if (optionId === "better" || optionId === "yes" || optionId === "still_well" || optionId === "advanced") {
    return "yes";
  }
  if (optionId === "mixed" || optionId === "a_little" || optionId === "keep_pace") {
    return "somewhat";
  }
  if (optionId === "not_yet" || optionId === "didnt_try" || optionId === "challenges_return" || optionId === "need_help") {
    return "no";
  }
  return null;
}

export function pickPrimaryCoachSession(
  sessions: CoachProgressViewModel[],
  maintenanceGoalIds: string[],
): CoachProgressViewModel | null {
  if (sessions.length === 0) return null;
  const active = sessions.filter((s) => s.progressPct < 100);
  if (active.length > 0) {
    return [...active].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
    )[0]!;
  }
  const maintenance = sessions.filter((s) => maintenanceGoalIds.includes(s.goalId) || s.progressPct >= 100);
  if (maintenance.length > 0) {
    return [...maintenance].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
    )[0]!;
  }
  return null;
}
