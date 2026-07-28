import type {
  GeneratedScriptPayload,
  QualityScoreBreakdown,
} from "../types/content-package.js";

export interface QualityScoreInput {
  payload: GeneratedScriptPayload;
  topicTitle: string;
  category: string;
  channelName?: string;
}

/** AI Quality Score — deterministic metrics 0–100. */
export function calculateQualityScore(input: QualityScoreInput): QualityScoreBreakdown {
  const { payload } = input;
  const clarity = scoreClarity(payload);
  const emotion = scoreEmotion(payload);
  const curiosity = scoreCuriosity(payload);
  const retention = scoreRetention(payload);
  const ctrPotential = scoreCtr(payload);
  const brandConsistency = scoreBrand(payload, input.channelName ?? "AmyNest");

  const overall = clamp(
    Math.round(
      clarity * 0.2 +
        emotion * 0.15 +
        curiosity * 0.15 +
        retention * 0.2 +
        ctrPotential * 0.15 +
        brandConsistency * 0.15,
    ),
  );

  return {
    overall,
    clarity,
    emotion,
    curiosity,
    retention,
    ctrPotential,
    brandConsistency,
  };
}

function scoreClarity(payload: GeneratedScriptPayload): number {
  const script = payload.voiceScript;
  const words = script.split(/\s+/).filter(Boolean);
  const sentences = Math.max(1, script.split(/[.!?]+/).filter(Boolean).length);
  const avg = words.length / sentences;
  let score = 55;
  if (avg >= 6 && avg <= 16) score += 25;
  if (payload.keyPoints.length >= 3) score += 10;
  if (!/\b(maybe|somehow|whatever|stuff)\b/i.test(script)) score += 10;
  return clamp(score);
}

function scoreEmotion(payload: GeneratedScriptPayload): number {
  const text = `${payload.hook} ${payload.story} ${payload.voiceScript}`;
  const hits = (
    text.match(
      /\b(calm|gentle|warm|love|proud|together|breathe|kind|safe|soft|connect)\b/gi,
    ) ?? []
  ).length;
  return clamp(50 + hits * 8);
}

function scoreCuriosity(payload: GeneratedScriptPayload): number {
  let score = 40;
  if (payload.openingQuestion.trim().endsWith("?")) score += 25;
  if (/\b(what if|why|how|notice|try this)\b/i.test(payload.hook)) score += 20;
  if (payload.titles.highCtr.length >= 20) score += 10;
  return clamp(score);
}

function scoreRetention(payload: GeneratedScriptPayload): number {
  let score = 45;
  if (payload.keyPoints.length >= 3 && payload.keyPoints.length <= 5) score += 20;
  if (payload.sceneScript.split("\n").length >= 3) score += 15;
  const secondsApprox = payload.voiceScript.split(/\s+/).length / 2.4;
  if (secondsApprox >= 15 && secondsApprox <= 35) score += 15;
  return clamp(score);
}

function scoreCtr(payload: GeneratedScriptPayload): number {
  let score = 45;
  const title = payload.titles.primary;
  if (title.length >= 28 && title.length <= 70) score += 20;
  if (!/\b(shocking|miracle|guaranteed)\b/i.test(title)) score += 15;
  if (/\b(tip|guide|calm|gentle|today|try)\b/i.test(payload.titles.highCtr)) score += 15;
  return clamp(score);
}

function scoreBrand(payload: GeneratedScriptPayload, channelName: string): number {
  const corpus = `${payload.cta} ${payload.voiceScript} ${payload.description.appPromotion} ${payload.titles.primary} ${payload.story}`;
  let score = 25;
  if (new RegExp(channelName.replace(/\s+/g, "\\s*"), "i").test(corpus)) score += 20;
  if (/amynest/i.test(corpus)) score += 20;
  if (payload.hashtags.some((h) => /amynest/i.test(h))) score += 10;
  if (
    /\b(learning|astro|health|speech|game|coach|audio|routine|habit|premium)\b/i.test(
      corpus,
    )
  ) {
    score += 15;
  }
  if (
    /download amynest|build better habits|start your child.s journey|google play|app store/i.test(
      corpus,
    )
  ) {
    score += 10;
  }
  return clamp(score);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
