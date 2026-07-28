/**
 * Hook engine — generate 10 hooks, rank, pick highest predicted retention.
 */

import type { StudioAnalyticsInsights, StudioEmotion, RankedHook, StudioTopicIdea } from "../types.js";

const HOOK_PATTERNS: Array<(idea: StudioTopicIdea) => string> = [
  (i) => `Most parents don't know this about ${short(i)}…`,
  (i) => `Before your child turns 6, try this for ${short(i)}.`,
  (i) => `This one habit changes everything for ${short(i)}.`,
  (i) => `What if ${short(i)} felt easy tonight?`,
  (i) => `Parents who build ${short(i)} start with 90 seconds.`,
  (i) => `Your child is ready for ${short(i)} — here's the calm way.`,
  (i) => `Stop guessing. AmyNest shows a clearer path to ${short(i)}.`,
  (i) => `The gentle switch that lifts ${short(i)} at home.`,
  (i) => `Curious why some kids grow ${short(i)} faster?`,
  (i) => `A proud parent moment starts with ${short(i)}.`,
];

function short(idea: StudioTopicIdea): string {
  return (idea.featureTitle ?? idea.category).replace(/^AmyNest\s*/i, "").trim().toLowerCase();
}

function emotionBoost(emotion: StudioEmotion): number {
  switch (emotion) {
    case "curiosity":
      return 6;
    case "hope":
      return 5;
    case "pride":
      return 4;
    case "confidence":
      return 4;
    case "calm":
      return 3;
    case "bonding":
      return 3;
    case "achievement":
      return 4;
    case "routine-success":
      return 3;
    default:
      return 2;
  }
}

function patternBoost(text: string): number {
  let score = 0;
  if (/most parents/i.test(text)) score += 8;
  if (/before your child/i.test(text)) score += 7;
  if (/one habit|changes everything/i.test(text)) score += 8;
  if (/\?$/.test(text.trim())) score += 5;
  if (/90 seconds|tonight|calm/i.test(text)) score += 4;
  if (/amynest/i.test(text)) score += 3;
  if (text.length > 20 && text.length < 90) score += 4;
  return score;
}

export function generateHooks(
  idea: StudioTopicIdea,
  insights?: StudioAnalyticsInsights,
): RankedHook[] {
  const winning = insights?.winningHooks ?? [];
  const hooks: RankedHook[] = HOOK_PATTERNS.map((fn, index) => {
    const text = fn(idea);
    let score = 55 + emotionBoost(idea.emotion) + patternBoost(text);
    for (const win of winning) {
      const token = win.toLowerCase().slice(0, 24);
      if (token.length > 8 && text.toLowerCase().includes(token.slice(0, 12))) {
        score += 10;
      }
    }
    // Slight diversity so ranks differ stably.
    score += (index % 3) * 0.3;
    const retentionPredict = Math.min(96, 70 + score * 0.28 + idea.estimatedRetention * 0.12);
    return {
      text,
      score: Math.round(score * 10) / 10,
      retentionPredict: Math.round(retentionPredict * 10) / 10,
      emotion: idea.emotion,
    };
  });

  return hooks.sort((a, b) => b.retentionPredict - a.retentionPredict || b.score - a.score);
}

export function pickBestHook(hooks: RankedHook[]): RankedHook {
  return hooks[0]!;
}
