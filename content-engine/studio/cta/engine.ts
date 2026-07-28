/**
 * CTA engine — 10 variations, ranked with analytics memory.
 */

import type { RankedCta, StudioAnalyticsInsights, StudioTopicIdea } from "../types.js";

const CTA_LIBRARY: Array<{ text: string; style: RankedCta["style"] }> = [
  { text: "Download AmyNest AI", style: "direct" },
  { text: "Start Free Today", style: "direct" },
  { text: "Build Better Habits", style: "benefit" },
  { text: "Raise Happy Learners", style: "benefit" },
  { text: "Learn Through Play", style: "play" },
  { text: "Open AmyNest AI and try it tonight", style: "soft" },
  { text: "Give your child a calmer learning path", style: "benefit" },
  { text: "Start your free AmyNest journey", style: "soft" },
  { text: "Play, learn, grow — with AmyNest AI", style: "play" },
  { text: "Download AmyNest AI — available on Google Play and the App Store", style: "direct" },
];

export function generateCtas(
  idea: StudioTopicIdea,
  insights?: StudioAnalyticsInsights,
): RankedCta[] {
  const winning = (insights?.winningCtas ?? []).map((c) => c.toLowerCase());

  const ranked = CTA_LIBRARY.map((cta, index) => {
    let score = 60;
    if (cta.style === "benefit") score += 6;
    if (cta.style === "play" && /game|learn|play|creativ/i.test(idea.category)) score += 8;
    if (cta.style === "direct" && idea.category === "Premium") score += 5;
    if (/habit|routine/i.test(idea.category) && /habit/i.test(cta.text)) score += 7;
    if (/download amynest/i.test(cta.text)) score += 4;
    for (const win of winning) {
      if (win.includes(cta.text.toLowerCase().slice(0, 18))) score += 12;
    }
    score += (10 - index) * 0.2;
    score += idea.estimatedCtr * 0.8;
    return { text: cta.text, score: Math.round(score * 10) / 10, style: cta.style };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

export function pickBestCta(ctas: RankedCta[]): RankedCta {
  return ctas[0]!;
}
