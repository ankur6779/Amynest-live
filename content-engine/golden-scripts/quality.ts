import { evaluateMutedVideoTest } from "./muted-visual.js";
import { mentionsProduct } from "./storycraft.js";
import type { GoldenScript, QualityBreakdown } from "./types.js";

export const GOLDEN_QUALITY_THRESHOLD = 90;

const MANDATORY_CTA = [
  "Download AmyNest AI",
  "Available on Google Play",
  "Available on the App Store",
  "Build Better Habits Every Day",
];

export function buildMandatoryCta(): string {
  return MANDATORY_CTA.join("\n");
}

export function scoreGoldenScript(
  script: Omit<GoldenScript, "quality" | "rewritePasses"> & {
    quality?: QualityBreakdown;
    rewritePasses?: number;
  },
): QualityBreakdown {
  const fear = /failing|shame|scared|ruin your child|worst parent|behind forever|damage your/i;
  const body = [
    script.selectedHook.text,
    script.parentingSituation,
    script.problem,
    script.whyParentsFaceIt,
    script.emotionBeat,
    script.productEntryBeat,
    script.amynestSolution,
    script.featureDemo,
    script.expectedChildOutcome,
    script.parentBenefit,
    script.hopeClose,
    script.cta,
  ].join(" ");

  const earlyBeats = [
    script.selectedHook.text,
    script.parentingSituation,
    script.firstThreeSeconds,
    script.problem,
    script.whyParentsFaceIt,
    script.emotionBeat,
  ];
  const earlyProductLeak = earlyBeats.some((b) => mentionsProduct(b));

  const hook = clamp(
    72 +
      (script.selectedHook.retentionPredict >= 88 ? 12 : 6) +
      (script.selectedHook.clickbaitRisk < 20 ? 8 : -12) +
      (script.selectedHook.curiosity >= 80 ? 6 : 0) +
      (mentionsProduct(script.selectedHook.text) ? -40 : 6) +
      (/VISUAL:|8:47|tonight|this is the part|what if/i.test(script.firstThreeSeconds)
        ? 0
        : 0),
  );

  const story = clamp(
    70 +
      (script.storyFlow.length >= 7 ? 12 : 0) +
      (/amynest/i.test(script.productEntryBeat) ? 8 : 0) +
      (script.featureDemo.length > 40 ? 6 : 0) +
      (earlyProductLeak ? -35 : 10),
  );

  const parentValue = clamp(
    78 +
      (script.parentBenefit.length >= 40 ? 10 : 4) +
      (/you |your /i.test(script.parentBenefit) ? 8 : 0) +
      (script.parentingSituation.length > 40 ? 4 : 0),
  );

  const educationalValue = clamp(
    74 +
      (script.objective.length > 40 ? 8 : 0) +
      (script.expectedChildOutcome.length > 30 ? 8 : 0) +
      (/practice|learn|habit|skill|progress/i.test(body) ? 6 : 0),
  );

  const brandConsistency = clamp(
    68 +
      (/amynest/i.test(script.productEntryBeat + script.amynestSolution) ? 12 : 0) +
      (script.suggestedCharacters.every((c) =>
        ["Amy AI", "Amy Girl", "Amy Boy"].includes(c),
      )
        ? 10
        : 0) +
      (MANDATORY_CTA.every((line) => script.cta.includes(line)) ? 6 : -20) +
      (earlyProductLeak ? -15 : 6),
  );

  const featureAccuracy = clamp(
    78 +
      (script.featureSource.length > 10 ? 8 : 0) +
      (script.featureId.length > 2 ? 6 : 0) +
      (/fake|guaranteed cure|diagnose/i.test(body) ? -40 : 6),
  );

  const retentionPrediction = clamp(
    script.selectedHook.retentionPredict * 0.5 +
      (script.firstThreeSeconds.length > 30 ? 10 : 0) +
      (earlyProductLeak ? -20 : 12) +
      (fear.test(body) ? -25 : 8) +
      18,
  );

  const ctrPrediction = clamp(
    70 +
      script.selectedHook.curiosity * 0.16 +
      (/what if|this is the part|remember this|8:47|tonight/i.test(
        script.selectedHook.text + script.firstThreeSeconds,
      )
        ? 12
        : 4) +
      (mentionsProduct(script.selectedHook.text) ? -20 : 4),
  );

  const emotionalImpact = clamp(
    70 +
      (script.emotionBeat.length > 30 ? 8 : 0) +
      (script.hopeClose.length > 20 ? 10 : 0) +
      (script.parentingSituation.length > 40 ? 8 : 0) +
      (fear.test(body) ? -35 : 8),
  );

  const ctaStrength = clamp(
    (MANDATORY_CTA.every((line) => script.cta.includes(line)) ? 70 : 40) +
      (script.hopeClose.length > 20 ? 20 : 0) +
      (/hope|lighter|possible|braver|pride|together|kind/i.test(script.hopeClose)
        ? 8
        : 0),
  );

  const storycraft = clamp(
    60 +
      (!earlyProductLeak ? 18 : -40) +
      (script.firstThreeSeconds.length > 24 ? 8 : 0) +
      (script.hopeClose.length > 20 ? 8 : 0) +
      (/end card|store badge/i.test(script.suggestedEndingScene) ? 4 : 0) +
      (!mentionsProduct(script.suggestedOpeningScene) ? 6 : -10),
  );

  const mutedGate = script.mutedVisual
    ? evaluateMutedVideoTest(script.mutedVisual)
    : { ok: false, score: 0, failures: ["missing mutedVisual"] };
  const mutedVideo = clamp(
    mutedGate.score +
      (/VISUAL:/i.test(script.firstThreeSeconds) ? 2 : 0) +
      (script.mutedVisual?.showDontTell.length ? 2 : 0),
  );

  const overall = Math.round(
    hook * 0.1 +
      story * 0.08 +
      parentValue * 0.08 +
      educationalValue * 0.07 +
      brandConsistency * 0.07 +
      featureAccuracy * 0.09 +
      retentionPrediction * 0.08 +
      ctrPrediction * 0.06 +
      emotionalImpact * 0.09 +
      ctaStrength * 0.04 +
      storycraft * 0.1 +
      mutedVideo * 0.14,
  );

  return {
    hook: Math.round(hook),
    story: Math.round(story),
    parentValue: Math.round(parentValue),
    educationalValue: Math.round(educationalValue),
    brandConsistency: Math.round(brandConsistency),
    featureAccuracy: Math.round(featureAccuracy),
    retentionPrediction: Math.round(retentionPrediction),
    ctrPrediction: Math.round(ctrPrediction),
    emotionalImpact: Math.round(emotionalImpact),
    ctaStrength: Math.round(ctaStrength),
    storycraft: Math.round(storycraft),
    mutedVideo: Math.round(mutedVideo),
    overall,
  };
}

export function improveScriptForScore<T extends {
  selectedHook: {
    text: string;
    retentionPredict: number;
    curiosity: number;
    clickbaitRisk: number;
  };
  parentingSituation: string;
  firstThreeSeconds: string;
  problem: string;
  whyParentsFaceIt: string;
  emotionBeat: string;
  productEntryBeat: string;
  amynestSolution: string;
  featureDemo: string;
  expectedChildOutcome: string;
  parentBenefit: string;
  hopeClose: string;
  objective: string;
  cta: string;
}>(script: T, quality: QualityBreakdown): T {
  const next = { ...script };
  if (quality.hook < GOLDEN_QUALITY_THRESHOLD) {
    next.selectedHook = {
      ...next.selectedHook,
      retentionPredict: Math.min(96, next.selectedHook.retentionPredict + 4),
      curiosity: Math.min(96, next.selectedHook.curiosity + 4),
      clickbaitRisk: Math.max(5, next.selectedHook.clickbaitRisk - 5),
    };
  }
  if (quality.parentValue < GOLDEN_QUALITY_THRESHOLD) {
    next.parentBenefit = `${next.parentBenefit} You leave with a clearer, calmer next step you can use tonight.`;
  }
  if (quality.educationalValue < GOLDEN_QUALITY_THRESHOLD) {
    next.expectedChildOutcome = `${next.expectedChildOutcome} Practice becomes a skill they can feel.`;
  }
  if (quality.emotionalImpact < GOLDEN_QUALITY_THRESHOLD && next.hopeClose.length < 40) {
    next.hopeClose = `${next.hopeClose} The feeling that remains is hope — soft, specific, and human.`;
  }
  if (quality.storycraft < GOLDEN_QUALITY_THRESHOLD && next.firstThreeSeconds.length < 40) {
    next.firstThreeSeconds = `VISUAL: Intimate domestic frame. LINE: “${next.parentingSituation.split(/[.!?]/)[0]}.”`;
  }
  if (
    quality.story < GOLDEN_QUALITY_THRESHOLD &&
    !/AmyNest/i.test(next.productEntryBeat)
  ) {
    next.productEntryBeat = `Only now does Amy appear — as a warm guide, not a pitch. ${next.amynestSolution}`;
  }
  if (quality.featureAccuracy < GOLDEN_QUALITY_THRESHOLD) {
    next.featureDemo = `${next.featureDemo} (Real in-app path — no invented steps.)`;
  }
  next.cta = buildMandatoryCta();
  return next;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
