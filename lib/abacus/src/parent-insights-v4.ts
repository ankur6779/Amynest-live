import type { LearningDna } from "./learning-dna.js";
import type { MasteryState } from "./mastery.js";
import { SKILL_LABELS, masterySummary, weakestSkill, strongestSkill } from "./mastery.js";
import type { ReviewSchedule } from "./spaced-repetition.js";
import { dueSkills } from "./spaced-repetition.js";

export type ParentInsightsV4 = {
  whatImproved: string;
  whereStruggling: string;
  parentPractice: string;
  expectedMasteryDate: string;
  attentionTrend: "up" | "steady" | "down";
  confidenceLabel: string;
  recommendations: string[];
};

export function buildParentInsightsV4(input: {
  dna: LearningDna;
  previousDna?: LearningDna | null;
  mastery: MasteryState;
  review: ReviewSchedule;
  currentLevel: number;
}): ParentInsightsV4 {
  const summary = masterySummary(input.mastery);
  const weak = weakestSkill(input.mastery);
  const strong = strongestSkill(input.mastery);
  const prev = input.previousDna;

  const accDelta = prev ? input.dna.accuracy - prev.accuracy : 0;
  const whatImproved =
    accDelta > 3
      ? `Accuracy improved by about ${Math.round(accDelta)} points this period.`
      : strong
        ? `Strongest signal: ${SKILL_LABELS[strong.skill]} (${strong.tier}).`
        : "Keep short daily sessions — improvement compounds.";

  const whereStruggling = weak
    ? `${SKILL_LABELS[weak.skill]} needs gentle review (${weak.tier}, score ${weak.score}).`
    : "No major struggle yet — stay consistent.";

  const due = dueSkills(input.review);
  const parentPractice = weak
    ? `Tonight: 3 minutes on ${SKILL_LABELS[weak.skill]} with beads, then one mental question.`
    : "Tonight: one warm-up + one cheer — keep the streak alive.";

  // Rough ETA: remaining mastery points / daily improvement heuristic
  const remaining = Math.max(0, 80 - summary.averageScore);
  const dailyGain = Math.max(1, Math.round(input.dna.improvementRate / 25));
  const days = Math.ceil(remaining / dailyGain);
  const eta = new Date();
  eta.setUTCDate(eta.getUTCDate() + days);
  const expectedMasteryDate = eta.toISOString().slice(0, 10);

  let attentionTrend: ParentInsightsV4["attentionTrend"] = "steady";
  if (prev) {
    if (input.dna.attention > prev.attention + 5) attentionTrend = "up";
    else if (input.dna.attention < prev.attention - 5) attentionTrend = "down";
  }

  const confidenceLabel =
    input.dna.confidence >= 75
      ? "High"
      : input.dna.confidence >= 50
        ? "Building"
        : "Needs encouragement";

  const recommendations = [
    parentPractice,
    due[0] ? `Spaced review due: ${SKILL_LABELS[due[0]]}.` : "No overdue reviews — nice!",
    `Stay on Level ${input.currentLevel} until Challenge accuracy is steady, then unlock the Boss.`,
    input.dna.preferredTutorStyle === "gentle"
      ? "Prefer gentle Amy mode — celebrate effort over speed."
      : "They're ready for playful stretch challenges.",
  ];

  return {
    whatImproved,
    whereStruggling,
    parentPractice,
    expectedMasteryDate,
    attentionTrend,
    confidenceLabel,
    recommendations,
  };
}
