/**
 * Retention engine — predict drop-off, tighten pacing, target 90%+.
 */

import type { RetentionPlan, StoryBeatPlan, StudioTopicIdea } from "../types.js";

export const RETENTION_TARGET = 90;

export function planRetention(input: {
  idea: StudioTopicIdea;
  story: StoryBeatPlan;
  hookRetentionPredict: number;
}): RetentionPlan {
  const dropOffRisks: string[] = [];
  const pacingNotes: string[] = [];

  if (input.hookRetentionPredict < 82) {
    dropOffRisks.push("Hook may lose viewers in the first 2 seconds — sharpen curiosity.");
    pacingNotes.push("Open on a concrete parent moment in under 8 words.");
  }

  if (input.story.problem.length > 140) {
    dropOffRisks.push("Problem beat is long — risk of mid-open drop.");
    pacingNotes.push("Cut problem to one sentence; jump to why it happens.");
  }

  if (!/amynest/i.test(input.story.amynestSolution)) {
    dropOffRisks.push("Solution beat weak on product clarity.");
    pacingNotes.push("Name AmyNest AI explicitly in the solution beat.");
  }

  if (input.idea.recommendedDuration > 20) {
    pacingNotes.push("Keep mid-section visual change every 2–3 seconds.");
  } else {
    pacingNotes.push("15–20s Short: one idea, one demo, one emotional payoff.");
  }

  pacingNotes.push("Pattern interrupt before CTA: smile / glow / logo pulse.");
  pacingNotes.push("End card must land while retention is still high — no dead air.");

  let predicted =
    input.hookRetentionPredict * 0.45 +
    input.idea.estimatedRetention * 0.35 +
    (dropOffRisks.length === 0 ? 12 : Math.max(0, 12 - dropOffRisks.length * 4));

  predicted = Math.min(97, Math.max(68, predicted));

  if (predicted < RETENTION_TARGET) {
    pacingNotes.push(
      "AUTO-IMPROVE: shorten problem, move demo earlier, add one pride beat before CTA.",
    );
  }

  return {
    predictedRetention: Math.round(predicted * 10) / 10,
    dropOffRisks,
    pacingNotes,
    targetRetention: RETENTION_TARGET,
  };
}

export function formatRetentionForPrompt(plan: RetentionPlan): string {
  return [
    `RETENTION TARGET: ${plan.targetRetention}%+ (predicted ${plan.predictedRetention}%).`,
    plan.dropOffRisks.length
      ? `Drop-off risks: ${plan.dropOffRisks.join(" | ")}`
      : "Drop-off risks: none critical.",
    `Pacing: ${plan.pacingNotes.join(" ")}`,
  ].join("\n");
}
