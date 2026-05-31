import { coachGoalCategoryId } from "./catalog.js";
import {
  type CoachFeedbackRow,
  type CoachPlanRef,
  computeProgressTrend,
  type CoachFeedback,
} from "./progress-view.js";

export type GraduationPath = "maintenance" | "strengthen" | "new_goal";

export interface CoachGraduationInput {
  goalId: string;
  goalTitle: string;
  answers: Record<string, string | string[]>;
  plan?: CoachPlanRef | null;
  feedbacks: CoachFeedbackRow[];
  completedGoalIds?: string[];
  relatedGoalCatalog?: { id: string; title: string; categoryId: string }[];
}

export interface CoachGraduationViewModel {
  goalId: string;
  goalTitle: string;
  headline: string;
  subheadline: string;
  whenStarted: string[];
  today: string[];
  amyStrengths: string[];
  strengthenOption: {
    goalId: string;
    title: string;
    description: string;
  } | null;
  recommendedGoals: { id: string; title: string; reason: string }[];
}

export interface CoachPastSuccess {
  sessionId: string;
  goalId: string;
  goalTitle: string;
  completedAt: string;
  graduationPath?: GraduationPath;
  maintenanceMode?: boolean;
}

const STRENGTHEN_GOALS: Record<string, { goalId: string; title: string; description: string }> = {
  "travel-with-kids": {
    goalId: "travel-with-kids",
    title: "Travel With Confidence",
    description: "Build on your progress with deeper strategies for longer trips and tougher moments.",
  },
  "manage-tantrums": {
    goalId: "emotional-regulation",
    title: "Build Emotional Resilience",
    description: "Move from managing outbursts to helping your child recover and adapt faster.",
  },
  "toddler-tantrums": {
    goalId: "emotional-regulation",
    title: "Build Emotional Resilience",
    description: "Move from managing outbursts to helping your child recover and adapt faster.",
  },
  "handle-aggression": {
    goalId: "emotional-regulation",
    title: "Build Emotional Resilience",
    description: "Deepen calm responses and repair after intense moments.",
  },
  "fix-bedtime-resistance": {
    goalId: "consistent-sleep-routine",
    title: "Independent Sleep Skills",
    description: "Help your child settle with less help and more confidence at night.",
  },
  "improve-sleep-patterns": {
    goalId: "consistent-sleep-routine",
    title: "Independent Sleep Skills",
    description: "Help your child settle with less help and more confidence at night.",
  },
  "reduce-late-sleeping": {
    goalId: "consistent-sleep-routine",
    title: "Independent Sleep Skills",
    description: "Shift toward steadier nights and easier mornings.",
  },
  "parent-burnout": {
    goalId: "find-me-time",
    title: "Sustainable Parent Energy",
    description: "Protect the progress you've made and rebuild reserves for hard days.",
  },
};

const STARTED_BY_GOAL: Record<string, string[]> = {
  "travel-with-kids": [
    "Travel situations felt stressful",
    "Emotional reactions happened frequently",
    "You wanted calmer family trips",
  ],
  "manage-tantrums": [
    "Outbursts felt hard to interrupt",
    "Emotional reactions happened frequently",
    "You wanted more calm in tough moments",
  ],
  "fix-bedtime-resistance": [
    "Bedtime felt like a nightly battle",
    "Delays and resistance were common",
    "You wanted easier, calmer evenings",
  ],
  "parent-burnout": [
    "Parenting felt exhausting most days",
    "Recovery time was hard to find",
    "You wanted to feel more like yourself again",
  ],
};

const TODAY_BY_CATEGORY: Record<string, string[]> = {
  behavior: [
    "More predictable responses in hard moments",
    "Better emotional regulation",
    "Stronger parent confidence",
  ],
  "toddler-behavior": [
    "Shorter or less intense meltdowns",
    "Quicker recovery after tough moments",
    "More calm connection with your child",
  ],
  sleep: [
    "Smoother bedtime transitions",
    "Less resistance at night",
    "More consistent sleep rhythms",
  ],
  "special-situations": [
    "More predictable travel experiences",
    "Better emotional regulation on the go",
    "Stronger parent confidence in stressful moments",
  ],
  "for-you": [
    "More awareness of your stress signals",
    "Better recovery after hard moments",
    "Stronger sense of balance",
  ],
};

const DEFAULT_STARTED = [
  "This challenge felt frequent and draining",
  "Small moments added up to a lot of stress",
  "You wanted practical change that fits real life",
];

const DEFAULT_TODAY = [
  "More predictable responses in hard moments",
    "Better emotional regulation",
    "Stronger parent confidence",
];

const STRENGTH_LABELS: Record<string, string> = {
  emotional: "Emotional coaching",
  consistency: "Consistency",
  small_actions: "Small repeated actions",
  validation: "Validation and connection",
  routines: "Predictable routines",
  calm: "Staying calm in the moment",
  repair: "Repair after hard moments",
};

function answersToStartedBullets(
  goalId: string,
  goalTitle: string,
  answers: Record<string, string | string[]>,
): string[] {
  const preset = STARTED_BY_GOAL[goalId];
  const bullets: string[] = [];

  if (answers.severity === "Severe – daily struggle") {
    bullets.push(`${goalTitle} felt like a daily struggle`);
  } else if (answers.severity === "Moderate – frequent") {
    bullets.push(`${goalTitle.toLowerCase()} came up fairly often`);
  }

  if (answers.common_frequency === "Daily") {
    bullets.push("This was happening several times a week");
  } else if (answers.common_frequency === "Weekly") {
    bullets.push("This was happening frequently enough to wear you down");
  }

  if (answers.distance === "Long") bullets.push("Long trips felt especially stressful");
  if (answers.child_behavior === "Restless") bullets.push("Restlessness made travel harder");
  if (answers.trigger === "Tired") bullets.push("Tiredness often made things worse");
  if (answers.delay_reason === "Screen") bullets.push("Screens were delaying bedtime");
  if (answers.emotion_type === "Anger") bullets.push("Anger showed up often in hard moments");

  const triggers = answers.triggers;
  if (Array.isArray(triggers) && triggers.some((t) => String(t).toLowerCase().includes("transition"))) {
    bullets.push("Transitions were a common trigger");
  }

  if (preset) {
    for (const p of preset) {
      if (!bullets.some((b) => b.toLowerCase().includes(p.toLowerCase().slice(0, 12))) && bullets.length < 3) {
        bullets.push(p);
      }
    }
  }

  if (bullets.length === 0) return DEFAULT_STARTED.slice(0, 3);
  while (bullets.length < 3) {
    const next = DEFAULT_STARTED[bullets.length];
    if (next && !bullets.includes(next)) bullets.push(next);
    else break;
  }
  return bullets.slice(0, 3);
}

function feedbackStrengths(feedbacks: CoachFeedbackRow[], plan?: CoachPlanRef | null): string[] {
  const strengths = new Set<string>();
  const yesWins = feedbacks.filter((f) => f.feedback === "yes").map((f) => f.win);
  const workedTitles = yesWins
    .map((wn) => plan?.wins.find((w) => w.win === wn)?.title?.toLowerCase() ?? "")
    .join(" ");

  if (/valid|emotion|name|feel|calm|breathe|connect/.test(workedTitles)) {
    strengths.add(STRENGTH_LABELS.emotional!);
    strengths.add(STRENGTH_LABELS.validation!);
  }
  if (/routine|predict|before|when-then|visual|schedule/.test(workedTitles)) {
    strengths.add(STRENGTH_LABELS.routines!);
  }
  if (/repair|after|reconnect|sorry|hug/.test(workedTitles)) {
    strengths.add(STRENGTH_LABELS.repair!);
  }
  if (/pause|wait|calm|breath|lower/.test(workedTitles)) {
    strengths.add(STRENGTH_LABELS.calm!);
  }

  const yesCount = feedbacks.filter((f) => f.feedback === "yes").length;
  const somewhatCount = feedbacks.filter((f) => f.feedback === "somewhat").length;
  if (yesCount >= 2 || somewhatCount >= 2) strengths.add(STRENGTH_LABELS.consistency!);
  if (feedbacks.length >= 3) strengths.add(STRENGTH_LABELS.small_actions!);

  const trend = computeProgressTrend(feedbacks);
  if (trend === "improving" || trend === "strong_momentum") {
    strengths.add(STRENGTH_LABELS.emotional!);
  }

  const ordered = [
    STRENGTH_LABELS.emotional!,
    STRENGTH_LABELS.consistency!,
    STRENGTH_LABELS.small_actions!,
    STRENGTH_LABELS.validation!,
    STRENGTH_LABELS.routines!,
    STRENGTH_LABELS.calm!,
    STRENGTH_LABELS.repair!,
  ].filter((s) => strengths.has(s));

  if (ordered.length === 0) {
    return [
      STRENGTH_LABELS.emotional!,
      STRENGTH_LABELS.consistency!,
      STRENGTH_LABELS.small_actions!,
    ];
  }
  return ordered.slice(0, 3);
}

function todayBullets(goalId: string, feedbacks: CoachFeedbackRow[]): string[] {
  const categoryId = coachGoalCategoryId(goalId) ?? "behavior";
  const base = TODAY_BY_CATEGORY[categoryId] ?? DEFAULT_TODAY;
  const trend = computeProgressTrend(feedbacks);
  if (trend === "strong_momentum" || trend === "improving") {
    return base;
  }
  if (trend === "needs_attention") {
    return [
      "Some strategies are starting to land",
      "You're more aware of what triggers hard moments",
      "You have tools to try when things get tough",
    ];
  }
  return base;
}

function recommendGoals(
  goalId: string,
  completedGoalIds: string[],
  catalog: { id: string; title: string; categoryId: string }[],
): { id: string; title: string; reason: string }[] {
  const categoryId = coachGoalCategoryId(goalId);
  const completed = new Set([...completedGoalIds, goalId]);
  const candidates = catalog.filter((g) => !completed.has(g.id));

  const sameCategory = candidates.filter((g) => g.categoryId === categoryId);
  const related = sameCategory.length >= 2 ? sameCategory : candidates;

  const picked: { id: string; title: string; reason: string }[] = [];
  for (const g of related) {
    if (picked.length >= 3) break;
    picked.push({
      id: g.id,
      title: g.title,
      reason:
        g.categoryId === categoryId
          ? "Builds on what you've already learned"
          : "A natural next area to strengthen",
    });
  }
  return picked;
}

export function buildCoachGraduationViewModel(input: CoachGraduationInput): CoachGraduationViewModel {
  const strengthenOption =
    STRENGTHEN_GOALS[input.goalId] ??
    ({
      goalId: input.goalId,
      title: `${input.goalTitle} — Advanced`,
      description: "Continue improving this area beyond your original goal.",
    } as const);

  return {
    goalId: input.goalId,
    goalTitle: input.goalTitle,
    headline: "You've Come A Long Way",
    subheadline:
      "Your progress suggests this challenge is no longer creating the same level of difficulty it once did.",
    whenStarted: answersToStartedBullets(input.goalId, input.goalTitle, input.answers),
    today: todayBullets(input.goalId, input.feedbacks),
    amyStrengths: feedbackStrengths(input.feedbacks, input.plan),
    strengthenOption,
    recommendedGoals: recommendGoals(
      input.goalId,
      input.completedGoalIds ?? [],
      input.relatedGoalCatalog ?? [],
    ),
  };
}

export function shouldSuggestGoalReactivation(input: {
  maintenanceMode?: boolean;
  graduatedAt?: string;
  recentFeedbacks?: { feedback: CoachFeedback }[];
}): boolean {
  if (!input.maintenanceMode || !input.graduatedAt) return false;
  const recent = input.recentFeedbacks ?? [];
  if (recent.length < 2) return false;
  const noCount = recent.filter((f) => f.feedback === "no").length;
  const trend = computeProgressTrend(
    recent.map((f, i) => ({ win: i + 1, feedback: f.feedback, at: new Date().toISOString() })),
  );
  return noCount >= 2 || trend === "needs_attention";
}
