/**
 * Quality AI — score before render; gate at overall ≥ 90.
 */

import type {
  RankedCta,
  RankedHook,
  RetentionPlan,
  StoryBeatPlan,
  StudioQualityGate,
  StudioQualityScores,
  StudioTopicIdea,
} from "../types.js";

export const STUDIO_QUALITY_THRESHOLD = 90;

export function scoreStudioCreative(input: {
  idea: StudioTopicIdea;
  hook: RankedHook;
  cta: RankedCta;
  story: StoryBeatPlan;
  retention: RetentionPlan;
  brandOk?: boolean;
}): StudioQualityScores {
  const hook = clamp(input.hook.score + (input.hook.retentionPredict > 85 ? 8 : 0));
  const retention = clamp(
    input.retention.predictedRetention +
      (input.retention.dropOffRisks.length === 0 ? 6 : -input.retention.dropOffRisks.length * 4),
  );
  const ctr = clamp(50 + input.idea.estimatedCtr * 5 + (input.cta.score > 70 ? 8 : 0));
  const brand = input.brandOk === false ? 55 : clamp(
    78 +
      (/amynest/i.test(input.story.amynestSolution) ? 10 : 0) +
      (/download|start free|amynest/i.test(input.cta.text) ? 8 : 0),
  );
  const emotion = clamp(
    70 +
      (input.idea.emotion === "curiosity" || input.idea.emotion === "pride" ? 12 : 8) +
      (/fear|shame|failing/i.test(JSON.stringify(input.story)) ? -40 : 6),
  );
  const educationalValue = clamp(
    72 +
      (input.story.featureDemo.length > 40 ? 10 : 0) +
      (Boolean(input.idea.featureTitle) ? 8 : 0),
  );
  const parentAppeal = clamp(
    74 +
      (/parent|calm|habit|confidence/i.test(input.story.parentBenefit) ? 12 : 4),
  );
  const childAppeal = clamp(
    72 +
      (/play|proud|curious|learn/i.test(input.story.childBenefit) ? 12 : 4),
  );

  const overall = Math.round(
    hook * 0.18 +
      retention * 0.2 +
      ctr * 0.12 +
      brand * 0.15 +
      emotion * 0.1 +
      educationalValue * 0.1 +
      parentAppeal * 0.08 +
      childAppeal * 0.07,
  );

  return {
    hook: Math.round(hook),
    retention: Math.round(retention),
    ctr: Math.round(ctr),
    brand: Math.round(brand),
    emotion: Math.round(emotion),
    educationalValue: Math.round(educationalValue),
    parentAppeal: Math.round(parentAppeal),
    childAppeal: Math.round(childAppeal),
    overall,
  };
}

export function evaluateStudioQualityGate(
  scores: StudioQualityScores,
  threshold = STUDIO_QUALITY_THRESHOLD,
): StudioQualityGate {
  if (scores.overall >= threshold) {
    return { ok: true, threshold, scores };
  }

  const weak: string[] = [];
  if (scores.hook < threshold) weak.push("sharpen the hook in the first line");
  if (scores.retention < threshold) weak.push("tighten pacing and cut confusion");
  if (scores.ctr < threshold) weak.push("strengthen curiosity and CTA clarity");
  if (scores.brand < threshold) weak.push("name AmyNest AI and real feature clearly");
  if (scores.emotion < threshold) weak.push("lead with warm pride/curiosity — never fear");
  if (scores.educationalValue < threshold) weak.push("teach one concrete parent insight");
  if (scores.parentAppeal < threshold) weak.push("clarify parent benefit");
  if (scores.childAppeal < threshold) weak.push("clarify child joy/learning benefit");

  return {
    ok: false,
    threshold,
    scores,
    rewriteHint: `Studio quality ${scores.overall} < ${threshold}. Regenerate and ${weak.slice(0, 3).join("; ")}. Keep official characters and mandatory end card.`,
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
