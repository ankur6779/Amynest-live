export type CoachFeedback = "yes" | "somewhat" | "no";

export type ProgressTrend =
  | "improving"
  | "strong_momentum"
  | "building_consistency"
  | "needs_attention";

export type MilestoneCelebration =
  | "building_momentum"
  | "halfway"
  | "major_improvement"
  | "goal_complete";

export interface CoachWinRef {
  win: number;
  title: string;
  objective?: string;
  actions?: string[];
  micro_task?: string;
}

export interface CoachPlanRef {
  title: string;
  summary?: string;
  root_cause?: string;
  wins: CoachWinRef[];
}

export interface CoachFeedbackRow {
  win: number;
  feedback: string;
  at: string;
}

export interface CoachProgressViewModel {
  sessionId: string;
  goalId: string;
  goalLabel: string;
  planTitle: string;
  planSummary: string;
  progressPct: number;
  goalDenominator: number;
  coachingWinsCompleted: number;
  recentOutcomes: { label: string; feedback: CoachFeedback; at: string }[];
  currentFocus: {
    title: string;
    summary: string;
    reason: string;
  } | null;
  progressTrend: ProgressTrend;
  nextMilestonePct: number;
  milestoneHints: string[];
  coachInsight: string;
  coachingStreakDays: number;
  suggestReassess: boolean;
  milestoneCelebration: MilestoneCelebration | null;
  lastUpdated: string;
  canResume: boolean;
}

const COACH_INSIGHTS = [
  "Children often improve through repeated small interactions rather than one big breakthrough. Keep practicing even when progress feels slow.",
  "Consistency matters more than perfection. A calmer response once today is real progress toward your goal.",
  "When change feels slow, look for tiny wins — shorter meltdowns, quicker recovery, or one moment of connection.",
  "Parenting goals shift through seasons. Small adjustments often create the biggest lasting change.",
  "Your child learns regulation from how you respond in hard moments. Each coached interaction builds that pattern.",
];

export function coachFeedbackPoints(f: CoachFeedback): number {
  return f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0;
}

export function goalDenominator(plan?: CoachPlanRef | null): number {
  if (!plan?.wins?.length) return 12;
  const upTo12 = plan.wins.filter((w) => w.win >= 1 && w.win <= 12);
  if (upTo12.length >= 12) return 12;
  if (plan.wins.length <= 12) return plan.wins.length;
  return 12;
}

export function computeGoalProgressPct(
  feedbacks: { feedback: string }[],
  denom: number,
): number {
  if (denom <= 0) return 0;
  const sum = feedbacks.reduce(
    (acc, f) => acc + coachFeedbackPoints(f.feedback as CoachFeedback),
    0,
  );
  return Math.min(100, Math.round((sum / denom) * 100));
}

export function computeProgressTrend(feedbacks: CoachFeedbackRow[]): ProgressTrend {
  const recent = [...feedbacks]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);
  if (recent.length === 0) return "building_consistency";
  const yes = recent.filter((f) => f.feedback === "yes").length;
  const no = recent.filter((f) => f.feedback === "no").length;
  const somewhat = recent.filter((f) => f.feedback === "somewhat").length;
  if (yes >= 3) return "strong_momentum";
  if (yes >= 2 && no === 0) return "improving";
  if (no >= 2) return "needs_attention";
  if (somewhat >= 2 || (yes >= 1 && somewhat >= 1)) return "building_consistency";
  return "building_consistency";
}

export function nextMilestonePct(currentPct: number): number {
  for (const m of [25, 50, 75, 100]) {
    if (currentPct < m) return m;
  }
  return 100;
}

export function milestoneCelebrationTier(pct: number): MilestoneCelebration | null {
  if (pct >= 100) return "goal_complete";
  if (pct >= 75) return "major_improvement";
  if (pct >= 50) return "halfway";
  if (pct >= 25) return "building_momentum";
  return null;
}

export function coachingStreakDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const daySet = new Set(dates.map((d) => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!daySet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function shouldSuggestReassess(feedbacks: CoachFeedbackRow[]): boolean {
  const recent = [...feedbacks]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);
  if (recent.length < 3) return false;
  const noCount = recent.filter((f) => f.feedback === "no").length;
  return noCount >= 3 || noCount / recent.length >= 0.6;
}

function winByNumber(plan: CoachPlanRef | null | undefined, winNumber: number): CoachWinRef | undefined {
  return plan?.wins.find((w) => w.win === winNumber);
}

export function outcomeLabel(win: CoachWinRef): string {
  const task = win.micro_task?.trim();
  if (task) return task;
  const action = win.actions?.[0]?.trim();
  if (action) return action;
  return win.title;
}

export function currentFocusReason(
  trend: ProgressTrend,
  recentFeedbacks: CoachFeedbackRow[],
): string {
  const recentYes = recentFeedbacks.filter((f) => f.feedback === "yes").length;
  const recentPartly = recentFeedbacks.filter((f) => f.feedback === "somewhat").length;
  const recentNo = recentFeedbacks.filter((f) => f.feedback === "no").length;

  if (recentYes >= 2) {
    return "Your recent feedback suggests emotional validation is creating the strongest improvement.";
  }
  if (recentPartly >= 2) {
    return "Amy is refining strategies based on what's partly working for your family.";
  }
  if (recentNo >= 2 || trend === "needs_attention") {
    return "Amy is shifting to a different angle based on what's been harder lately.";
  }
  if (trend === "strong_momentum" || trend === "improving") {
    return "Your recent wins show this approach is landing — Amy is building on that momentum.";
  }
  return "Amy selected this focus to keep your progress steady toward your goal.";
}

export function pickCoachInsight(goalId: string): string {
  let hash = 0;
  for (let i = 0; i < goalId.length; i += 1) {
    hash = (hash + goalId.charCodeAt(i)) % COACH_INSIGHTS.length;
  }
  return COACH_INSIGHTS[hash] ?? COACH_INSIGHTS[0]!;
}

export function buildCoachProgressViewModel(input: {
  sessionId: string;
  goalId: string;
  goalLabel: string;
  planTitle: string;
  plan?: CoachPlanRef | null;
  feedbacks: CoachFeedbackRow[];
  lastUpdated: string;
  canResume: boolean;
}): CoachProgressViewModel {
  const { plan, feedbacks } = input;
  const denom = goalDenominator(plan);
  const progressPct = computeGoalProgressPct(feedbacks, denom);
  const progressTrend = computeProgressTrend(feedbacks);
  const feedbackByWin = new Map(feedbacks.map((f) => [f.win, f]));

  const recentOutcomes = [...feedbacks]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6)
    .map((f) => {
      const win = winByNumber(plan, f.win);
      return {
        label: win ? outcomeLabel(win) : `Coaching step ${f.win}`,
        feedback: f.feedback as CoachFeedback,
        at: f.at,
      };
    });

  const pendingWin = plan?.wins.find((w) => !feedbackByWin.has(w.win));
  const focusWin = pendingWin ?? plan?.wins[plan.wins.length - 1];
  const recentForReason = [...feedbacks]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);

  const currentFocus = focusWin
    ? {
        title: focusWin.title,
        summary: plan?.summary?.trim() || focusWin.objective?.trim() || input.planTitle,
        reason: currentFocusReason(progressTrend, recentForReason),
      }
    : null;

  const milestoneHints =
    focusWin?.actions?.slice(0, 3).map((a) => a.trim()).filter(Boolean) ?? [
      "Pause before correcting",
      "Name emotions",
      "Ask what your child needs",
    ];

  return {
    sessionId: input.sessionId,
    goalId: input.goalId,
    goalLabel: input.goalLabel,
    planTitle: input.planTitle,
    planSummary: plan?.summary?.trim() ?? "",
    progressPct,
    goalDenominator: denom,
    coachingWinsCompleted: feedbacks.length,
    recentOutcomes,
    currentFocus,
    progressTrend,
    nextMilestonePct: nextMilestonePct(progressPct),
    milestoneHints,
    coachInsight: pickCoachInsight(input.goalId),
    coachingStreakDays: coachingStreakDays(feedbacks.map((f) => f.at)),
    suggestReassess: shouldSuggestReassess(feedbacks),
    milestoneCelebration: milestoneCelebrationTier(progressPct),
    lastUpdated: input.lastUpdated,
    canResume: input.canResume,
  };
}
