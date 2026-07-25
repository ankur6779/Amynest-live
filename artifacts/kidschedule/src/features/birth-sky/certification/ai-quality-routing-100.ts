/**
 * @deprecated Prefer api-server weighted router validation:
 *   cd artifacts/api-server && pnpm exec tsx scripts/birth-sky-router-validation-100.ts
 *   → certification/output/ai-router-optimization-100.json
 *
 * Legacy offline mirror (pre-weighted). Kept for historical comparison only.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeepInsightSections } from "../constants/deep-insights-content";
import { estimateReadingMinutes } from "../lib/sky-copy";

// Mirror server router heuristics (keep in sync with api-server ai-model-router.ts)
type Tier = "fast" | "reasoning";

const SIMPLE = [
  /\bwhat is\b/i,
  /\bwhat's\b/i,
  /\bexplain\b/i,
  /\bsummarize\b/i,
  /\bmeaning\b/i,
  /\btell me about\b/i,
  /\bplanet\b/i,
  /\bsun sign\b/i,
  /\bmoon sign\b/i,
];
const DEEP = [
  /\bconfidence\b/i,
  /\bemotion/i,
  /\banxiety\b/i,
  /\bschool\b/i,
  /\bparenting\b/i,
  /\bfriendship/i,
  /\bbehaviou?r\b/i,
  /\bhow (can|do|should) i\b/i,
  /\bhelp (me|them)\b/i,
];
const REFLECTION = [/\breflect/i, /\bjournal\b/i];
const KEEPSAKE = [/\bkeepsake\b/i, /\bprint\b/i];

function route(text: string, priorTurnCount = 0, entryPoint = "sky"): { tier: Tier; reason: string } {
  if (KEEPSAKE.some((r) => r.test(text))) return { tier: "reasoning", reason: "keepsake" };
  if (REFLECTION.some((r) => r.test(text)) || entryPoint === "reflect")
    return { tier: "reasoning", reason: "reflection" };
  if (priorTurnCount >= 4) return { tier: "reasoning", reason: "multi_turn_depth" };
  if (DEEP.some((r) => r.test(text))) return { tier: "reasoning", reason: "deep" };
  if (SIMPLE.some((r) => r.test(text))) return { tier: "fast", reason: "simple" };
  if (text.length < 48) return { tier: "fast", reason: "quick_followup" };
  return { tier: "fast", reason: "default_fast" };
}

const PROMPTS: string[] = [
  "What does the Moon mean?",
  "Explain their Sun sign briefly.",
  "Summarize today's visit.",
  "Tell me about the Full Moon phase.",
  "What is Rising?",
  "Short answer: Sun in Aries?",
  "Planet explanation for Moon in Libra.",
  "What does Day Sky mean?",
  "Define Midheaven for parents.",
  "Quickly — what should I notice tonight?",
  "How can I help with their anxiety at school?",
  "I'm worried about friendships.",
  "Help me with parenting after meltdowns.",
  "How do I support their confidence?",
  "Their behaviour at bedtime is hard.",
  "What should I do about sibling jealousy?",
  "Help me with a difficult school decision.",
  "How can I meet their emotional needs?",
  "I'm overwhelmed by their anger.",
  "Future planning feels heavy — how do I stay gentle?",
  "Write a reflection for this week.",
  "Help me journal one noticing.",
  "Create a keepsake paragraph for print.",
  "Make a mindful closing for their storybook.",
  "ok",
  "thanks",
  "tell me more",
  "why?",
  "and then?",
  "What does this mean for learning?",
  ...Array.from({ length: 70 }, (_, i) => {
    const bank = [
      "Explain Moon phase.",
      "How can I help with emotions after school?",
      "Summarize strengths.",
      "Parenting tip for transitions?",
      "What is their Sun about?",
      "Reflect with me on belonging.",
      "Keepsake line for grandparents.",
      "Quick follow-up on curiosity.",
      "Friendship friction — what can I try?",
      "Confidence before a new class?",
    ];
    return bank[i % bank.length]!;
  }),
];

while (PROMPTS.length < 100) PROMPTS.push("Explain their chart gently.");
const prompts = PROMPTS.slice(0, 100);

const routes = prompts.map((p, i) => ({
  i,
  prompt: p,
  ...route(p, i % 6, i % 11 === 0 ? "reflect" : "sky"),
}));

const fastN = routes.filter((r) => r.tier === "fast").length;
const reasoningN = routes.filter((r) => r.tier === "reasoning").length;

// Token assumptions from prior live run (~3000 in / ~370 out)
const IN = 3000;
const OUT = 370;
const PRICE = {
  fast: { in: 0.25, out: 2.0 }, // gpt-5-mini approx
  reasoning: { in: 1.25, out: 10.0 }, // gpt-5 approx
};

function costPerMsg(tier: Tier) {
  const p = PRICE[tier];
  return (IN / 1e6) * p.in + (OUT / 1e6) * p.out;
}

const avgCost =
  routes.reduce((s, r) => s + costPerMsg(r.tier), 0) / routes.length;

const sections = buildDeepInsightSections({
  childName: "John",
  sunSign: "Aries",
  moonSign: "Libra",
  risingSign: null,
  moonPhaseLabel: "Full Moon",
  daySky: true,
});
const joined = sections.map((s) => s.body).join("\n");
const grammarFails = [
  /reward learning thrives/i,
  /respect warmth is balance/i,
  /protect growth softens/i,
  /Moon Moon/i,
  /\ba Aries\b/i,
].filter((re) => re.test(joined));

const reading = sections.map((s) => ({
  id: s.id,
  minutes: estimateReadingMinutes(s.body),
  words: s.body.trim().split(/\s+/).length,
}));

const report = {
  finishedAt: new Date().toISOString(),
  prompts: 100,
  modelRouting: {
    fast: fastN,
    reasoning: reasoningN,
    fastPct: fastN / 100,
    reasoningPct: reasoningN / 100,
    byReason: routes.reduce(
      (acc, r) => {
        acc[r.reason] = (acc[r.reason] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  },
  grammarGate: {
    brokenPatternsFound: grammarFails.map((r) => r.source),
    pass: grammarFails.length === 0,
  },
  chapterReadingSample: reading.slice(0, 8),
  costEstimateUsd: {
    perMessageAvg: Number(avgCost.toFixed(5)),
    perUser20Msg: Number((avgCost * 20).toFixed(4)),
    users100: Number((avgCost * 20 * 100).toFixed(2)),
    users1000: Number((avgCost * 20 * 1000).toFixed(2)),
    users10000: Number((avgCost * 20 * 10000).toFixed(2)),
    assumptions: {
      inputTokens: IN,
      outputTokens: OUT,
      msgsPerUserMonth: 20,
      fastModelPricePer1M: PRICE.fast,
      reasoningModelPricePer1M: PRICE.reasoning,
      note: "Projected from router mix; live latency/hydrate require production stream run.",
    },
  },
  liveMetricsNote:
    "Hydration/grounding/practical from prior live-50 v3 (deploy 28f19c6b8): hydrate 100%, grounding 100%, practical 92%, moderation 0%. Re-run live-100 after deploy for latency/token actuals.",
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "output");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "ai-quality-routing-100.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("wrote", outPath);
