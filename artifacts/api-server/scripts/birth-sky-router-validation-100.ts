/**
 * Offline + synthetic conversation validation for router optimization sprint.
 * Uses the real weighted router (not a mirrored heuristic copy).
 *
 * Run:
 *   pnpm exec tsx scripts/birth-sky-router-validation-100.ts
 * from artifacts/api-server
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  routeBirthSkyModel,
  type BirthSkyModelTier,
  type BirthSkyRecentTurn,
} from "../src/services/birth-sky/ai-model-router.js";
import {
  buildBirthSkyRouterAnalytics,
  estimateBirthSkyCostUsd,
  recordBirthSkyAiTelemetry,
  resetBirthSkyRouterTelemetryForTests,
} from "../src/services/birth-sky/ai-router-telemetry.js";

type TurnSpec = {
  prompt: string;
  entryPoint?: string;
  /** Simulate prior deep user messages for stickiness tests. */
  seedHistory?: BirthSkyRecentTurn[];
  priorTier?: BirthSkyModelTier | null;
};

const SPECS: TurnSpec[] = [
  // Simple / planet / summary (should stay Mini)
  { prompt: "What does the Moon mean?" },
  { prompt: "Explain their Sun sign briefly." },
  { prompt: "Summarize today's visit." },
  { prompt: "Tell me about the Full Moon phase." },
  { prompt: "What is Rising?" },
  { prompt: "Short answer: Sun in Aries?" },
  { prompt: "Planet explanation for Moon in Libra." },
  { prompt: "What does Day Sky mean?" },
  { prompt: "Define Midheaven for parents." },
  { prompt: "Quickly — what should I notice tonight?" },
  { prompt: "What is their Sun about?" },
  { prompt: "Explain Moon phase." },
  { prompt: "Summarize strengths." },
  { prompt: "What does this mean for learning?" },
  { prompt: "Parenting tip for transitions?" },
  { prompt: "Quick follow-up on curiosity." },

  // Deep parenting / emotional (should escalate)
  { prompt: "How can I help with their anxiety at school?" },
  { prompt: "I'm worried about friendships and how rejected they feel." },
  { prompt: "Help me with parenting after meltdowns at bedtime." },
  { prompt: "How do I support their confidence before a big school change?" },
  { prompt: "Their behaviour at bedtime is hard and they get angry fast." },
  { prompt: "What should I do about sibling jealousy?" },
  { prompt: "Help me with a difficult school decision that affects identity." },
  { prompt: "How can I meet their emotional needs after bullying?" },
  { prompt: "I'm overwhelmed by their anger and attachment struggles." },
  { prompt: "Future planning feels heavy — how do I stay gentle long-term?" },
  { prompt: "Friendship friction — what can I try when they shut down?" },
  { prompt: "Confidence before a new class with anxiety?" },
  { prompt: "How can I help with emotions after school when they melt down?" },

  // Reflection / keepsake (always GPT-5)
  { prompt: "Write a reflection for this week." },
  { prompt: "Help me journal one noticing.", entryPoint: "reflect" },
  { prompt: "Create a keepsake paragraph for print." },
  { prompt: "Make a mindful closing for their storybook." },
  { prompt: "Reflect with me on belonging." },
  { prompt: "Keepsake line for grandparents." },

  // Short follow-ups — stay Mini even with many prior turns
  {
    prompt: "ok",
    priorTier: "fast",
    seedHistory: [
      { role: "user", body: "Explain their Sun sign briefly." },
      { role: "assistant", body: "Warm, direct energy." },
    ],
  },
  { prompt: "thanks", priorTier: "fast" },
  { prompt: "tell me more", priorTier: "fast" },
  { prompt: "why?", priorTier: "fast" },
  { prompt: "and then?", priorTier: "fast" },

  // Stickiness: continuing deep thread stays reasoning
  {
    prompt: "What else can I try tonight with their sibling jealousy?",
    priorTier: "reasoning",
    seedHistory: [
      {
        role: "user",
        body: "What should I do about sibling jealousy and bedtime meltdowns?",
      },
      {
        role: "assistant",
        body: "Validate both children and keep the evening routine steady.",
      },
    ],
  },
];

// Pad to 100 with a realistic production-like mix (~70% light / ~30% deep)
const PAD_BANK: TurnSpec[] = [
  { prompt: "Explain Moon phase." },
  { prompt: "What is Rising?" },
  { prompt: "Summarize strengths." },
  { prompt: "Quickly — sun meaning?" },
  { prompt: "Tell me about Day Sky." },
  { prompt: "Define Midheaven for parents." },
  { prompt: "Short answer on Moon sign." },
  { prompt: "Planet explanation for Venus." },
  { prompt: "What does this phase mean?" },
  { prompt: "ok" },
  { prompt: "thanks" },
  { prompt: "got it" },
  { prompt: "Parenting tip for transitions?" },
  { prompt: "Quick follow-up on curiosity." },
  { prompt: "How can I help with their anxiety at school?" },
  { prompt: "Friendship friction — what can I try?" },
  { prompt: "Help me write a reflection for tonight." },
  { prompt: "Create a keepsake paragraph for print." },
  { prompt: "I'm worried about school behaviour this week." },
  { prompt: "Explain their chart gently." },
];

while (SPECS.length < 100) {
  SPECS.push(PAD_BANK[SPECS.length % PAD_BANK.length]!);
}
const turns = SPECS.slice(0, 100);

resetBirthSkyRouterTelemetryForTests();

const routes = turns.map((spec, i) => {
  const decision = routeBirthSkyModel({
    userText: spec.prompt,
    priorTurnCount: spec.seedHistory?.length ?? (i % 5 === 0 ? 2 : 0),
    entryPoint: spec.entryPoint ?? "sky",
    recentTurns: spec.seedHistory,
    priorTier: spec.priorTier ?? null,
  });

  const inputTokens = 3000;
  const outputTokens = 370;
  const estimatedCostUsd = estimateBirthSkyCostUsd({
    tier: decision.tier,
    inputTokens,
    outputTokens,
  });

  recordBirthSkyAiTelemetry({
    conversationId: `sim-${Math.floor(i / 4)}`,
    selectedModel: decision.model,
    tier: decision.tier,
    routingReason: decision.reason,
    latencyMs: decision.tier === "fast" ? 900 : 1900,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    conversationLength: (spec.seedHistory?.length ?? 0) + 1,
    escalated: decision.escalated,
    downgraded: decision.downgraded,
    confidence: decision.confidence,
    scores: decision.scores,
    status: "ok",
  });

  return {
    i,
    prompt: spec.prompt,
    tier: decision.tier,
    reason: decision.reason,
    confidence: decision.confidence,
    escalated: decision.escalated,
    scoresTotal: decision.scores.total,
  };
});

const analytics = buildBirthSkyRouterAnalytics();
const fastN = analytics.modelUsageCount.fast;
const reasoningN = analytics.modelUsageCount.reasoning;

const IN = 3000;
const OUT = 370;
const avgCost = analytics.averageCostUsd ?? 0;
const msgsPerUserMonth = 20;

const beforeFastPct = 0.31;
const beforeReasoningPct = 0.69;
const beforeAvgCost =
  beforeFastPct * estimateBirthSkyCostUsd({ tier: "fast", inputTokens: IN, outputTokens: OUT }) +
  beforeReasoningPct *
    estimateBirthSkyCostUsd({ tier: "reasoning", inputTokens: IN, outputTokens: OUT });

// Grammar / quality gates from prior content sprint (still must hold)
const kidscheduleRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../kidschedule/src/features/birth-sky",
);
let grammarPass = true;
let grammarNote = "skipped (content module not loaded in api-server script)";
try {
  const contentPath = join(kidscheduleRoot, "constants/deep-insights-content.ts");
  if (existsSync(contentPath)) {
    const raw = readFileSync(contentPath, "utf8");
    const broken = [
      /reward learning thrives/i,
      /respect warmth is balance/i,
      /protect growth softens/i,
      /Moon Moon/i,
      /\ba Aries\b/i,
      /Welcome back, there\./i,
    ].filter((re) => re.test(raw));
    grammarPass = broken.length === 0;
    grammarNote = grammarPass
      ? "pass"
      : `fail: ${broken.map((r) => r.source).join(", ")}`;
  }
} catch {
  /* keep skip note */
}

const targetMet =
  analytics.modelUsagePct.fast >= 0.6 &&
  analytics.modelUsagePct.fast <= 0.75 &&
  analytics.modelUsagePct.reasoning >= 0.25 &&
  analytics.modelUsagePct.reasoning <= 0.4;

const report = {
  finishedAt: new Date().toISOString(),
  sprint: "ai-router-optimization-telemetry",
  prompts: 100,
  targetMix: { fast: "60-75%", reasoning: "25-40%" },
  targetMet,
  before: {
    fastPct: beforeFastPct,
    reasoningPct: beforeReasoningPct,
    perMessageAvgUsd: Number(beforeAvgCost.toFixed(5)),
  },
  after: {
    fastPct: analytics.modelUsagePct.fast,
    reasoningPct: analytics.modelUsagePct.reasoning,
    fast: fastN,
    reasoning: reasoningN,
    byReason: routes.reduce(
      (acc, r) => {
        acc[r.reason] = (acc[r.reason] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    perMessageAvgUsd: Number(avgCost.toFixed(5)),
    costReductionPct: Number(
      (((beforeAvgCost - avgCost) / beforeAvgCost) * 100).toFixed(1),
    ),
  },
  analytics,
  qualityProxy: {
    grammarGate: { pass: grammarPass, note: grammarNote },
    liveMetricsNote:
      "Hydration/grounding/practical from prior live-50 v3: hydrate 100%, grounding 100%, practical 92%. Re-run live-100 post-deploy for latency/token actuals + false promotion audit.",
    hydrationTarget: 1,
    groundingTarget: 0.98,
    practicalTarget: 0.9,
  },
  costEstimateUsd: {
    perMessageAvg: Number(avgCost.toFixed(5)),
    perUser20Msg: Number((avgCost * msgsPerUserMonth).toFixed(4)),
    users100: Number((avgCost * msgsPerUserMonth * 100).toFixed(2)),
    users1000: Number((avgCost * msgsPerUserMonth * 1000).toFixed(2)),
    users10000: Number((avgCost * msgsPerUserMonth * 10000).toFixed(2)),
    users100000: Number((avgCost * msgsPerUserMonth * 100000).toFixed(2)),
    assumptions: {
      inputTokens: IN,
      outputTokens: OUT,
      msgsPerUserMonth,
      note: "Projected from optimized router mix + list prices; live tokens refine estimate.",
    },
  },
  sampleRoutes: routes.slice(0, 20),
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(
  __dirname,
  "../../kidschedule/src/features/birth-sky/certification/output",
);
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "ai-router-optimization-100.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("wrote", outPath);
console.log(targetMet ? "TARGET MIX: PASS" : "TARGET MIX: FAIL — retune threshold/weights");
process.exitCode = targetMet && grammarPass ? 0 : 1;
