import {
  computeSkillBreakdown,
  isActivityUnlocked,
  pickWeakActivities,
  SKILL_ACTIVITIES,
  type GapSeverity,
  type LearningGap,
  type LearningGapSummary,
  type PlaygroundLearningState,
  type SkillBreakdown,
} from "@workspace/math-playground";
import {
  avgResponseTimeMs,
  failureRate,
  hintRate,
  retryRate,
  suggestedActivityForSkill,
} from "./skill-signals";

const GAP_THRESHOLD = 55;
const WATCH_THRESHOLD = 68;

function gapSeverity(
  mastery: number,
  hintR: number,
  failR: number,
  retryR: number,
): GapSeverity {
  if (mastery < 35 || failR >= 0.4) return "urgent";
  if (mastery < GAP_THRESHOLD || hintR >= 0.5 || retryR >= 0.45) return "focus";
  if (mastery < WATCH_THRESHOLD) return "watch";
  return "watch";
}

function buildReasonKeys(
  skill: keyof SkillBreakdown,
  mastery: number,
  hintR: number,
  failR: number,
  retryR: number,
  slowResponse: boolean,
): string[] {
  const keys: string[] = [];
  if (mastery < GAP_THRESHOLD) keys.push(`gap_reason_low_mastery_${skill}`);
  if (hintR >= 0.35) keys.push("gap_reason_excessive_hints");
  if (failR >= 0.25) keys.push("gap_reason_frequent_mistakes");
  if (retryR >= 0.3) keys.push("gap_reason_repeated_retries");
  if (slowResponse) keys.push("gap_reason_slow_responses");
  if (keys.length === 0 && mastery < WATCH_THRESHOLD) keys.push(`gap_reason_practice_${skill}`);
  return keys;
}

function analyzeSkill(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
): LearningGap | null {
  const breakdown = computeSkillBreakdown(learning);
  const mastery = breakdown[skill];
  const sessions = learning.sessionHistory.filter((r) =>
    SKILL_ACTIVITIES[skill].includes(r.activityId),
  );
  if (sessions.length === 0 && mastery === 0) return null;

  const hintR = hintRate(learning, skill);
  const failR = failureRate(learning, skill);
  const retryR = retryRate(learning, skill);
  const avgMs = avgResponseTimeMs(learning, skill);
  const slowResponse = avgMs !== null && avgMs >= 20_000;

  if (mastery >= WATCH_THRESHOLD && hintR < 0.25 && failR < 0.15 && !slowResponse) {
    return null;
  }

  const severity = gapSeverity(mastery, hintR, failR, retryR);
  if (mastery >= WATCH_THRESHOLD && severity === "watch" && !slowResponse && hintR < 0.2) {
    return null;
  }

  return {
    skill,
    severity,
    reasonKeys: buildReasonKeys(skill, mastery, hintR, failR, retryR, slowResponse),
    suggestedActivityId: suggestedActivityForSkill(skill),
    masteryScore: mastery,
  };
}

export function detectLearningGaps(
  learning: PlaygroundLearningState,
  ageYears: number,
): LearningGapSummary {
  const skills: (keyof SkillBreakdown)[] = [
    "counting",
    "addition",
    "subtraction",
    "patterns",
    "multiplication",
    "division",
  ];

  const gaps: LearningGap[] = [];
  for (const skill of skills) {
    const activity = suggestedActivityForSkill(skill);
    if (!isActivityUnlocked(activity, ageYears) && skill !== "counting") continue;
    const gap = analyzeSkill(learning, skill);
    if (gap) gaps.push(gap);
  }

  gaps.sort((a, b) => {
    const severityOrder: Record<GapSeverity, number> = { urgent: 0, focus: 1, watch: 2 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return a.masteryScore - b.masteryScore;
  });

  const weak = pickWeakActivities(learning, ageYears, 3);
  const fromGaps = gaps.slice(0, 3).map((g) => g.suggestedActivityId);
  const recommendedFocus = [...new Set([...fromGaps, ...weak])].slice(0, 3);

  return {
    gaps,
    recommendedFocus,
    detectedAt: Date.now(),
    sessionCount: learning.sessionHistory.length,
  };
}
