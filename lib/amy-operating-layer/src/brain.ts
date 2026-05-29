import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { AmyOperatingContext, AmyCapability } from "./types.js";
import { generateDailyBriefing } from "./daily-briefing.js";
import { generateWeeklyReview } from "./weekly-review.js";
import { generateProactiveMessages } from "./proactive-amy.js";
import { buildGoalCoachState } from "./goal-coach.js";
import { INTERVENTION_PLAYBOOKS, selectActivePlaybook } from "./intervention-playbooks.js";
import { buildFamilyKnowledgeGraph } from "./knowledge-graph.js";
import { generateSuccessForecasts } from "./success-forecasting.js";
import { buildFamilyTimeline } from "./family-timeline.js";
import { buildExecutiveMode } from "./executive-mode.js";
import { trustGuidelinesForPrompt } from "./trust-safety.js";
import type { TimelineEvent } from "./types.js";

export const AMY_OPERATING_ENGINE_VERSION = "amy-operating-v1";

const ALL_CAPABILITIES: AmyCapability[] = [
  "planning",
  "coaching",
  "recommendations",
  "explanations",
  "interventions",
  "goal_management",
];

/**
 * Amy Operating Layer — transforms Family Intelligence into Amy's operating brain.
 */
export function buildAmyOperatingContext(
  snapshot: FamilyIntelligenceSnapshot,
  options: { localDate?: string; timelineHistory?: TimelineEvent[] } = {},
): AmyOperatingContext {
  const localDate = options.localDate ?? snapshot.computedAt.slice(0, 10);
  const timeline = buildFamilyTimeline(snapshot, options.timelineHistory ?? []);

  const dailyBriefing = generateDailyBriefing(snapshot, localDate);
  const weeklyReview = generateWeeklyReview(snapshot);
  const proactiveMessages = generateProactiveMessages(snapshot);
  const goalCoach = buildGoalCoachState(snapshot);
  const activePlaybook = selectActivePlaybook(snapshot);
  const knowledgeGraph = buildFamilyKnowledgeGraph(snapshot);
  const forecasts = generateSuccessForecasts(snapshot);
  const executiveMode = buildExecutiveMode(snapshot, timeline);

  const systemPromptBlock = buildSystemPromptBlock(snapshot, dailyBriefing, executiveMode);

  return {
    snapshot,
    capabilities: ALL_CAPABILITIES,
    dailyBriefing,
    weeklyReview,
    proactiveMessages,
    goalCoach,
    playbooks: INTERVENTION_PLAYBOOKS,
    activePlaybook,
    knowledgeGraph,
    forecasts,
    executiveMode,
    systemPromptBlock,
    engineVersion: AMY_OPERATING_ENGINE_VERSION,
  };
}

function buildSystemPromptBlock(
  snapshot: FamilyIntelligenceSnapshot,
  briefing: ReturnType<typeof generateDailyBriefing>,
  executive: ReturnType<typeof buildExecutiveMode>,
): string {
  const lines = [
    "=== AMY FAMILY OPERATING CONTEXT (authoritative — use this data) ===",
    `Child: ${snapshot.childName}`,
    `Family health: ${snapshot.health.score}/100 (${briefing.healthTrend})`,
    `Top priority: ${snapshot.topAction?.title ?? "maintain consistency"}`,
    `Primary risk: ${snapshot.risks.primaryRisk.replace(/_/g, " ")} (${Math.round(snapshot.risks.overallRisk * 100)}%)`,
    "",
    "TODAY'S WINS:",
    ...briefing.wins.map((w) => `- ${w}`),
    "",
    "TODAY'S RISKS:",
    ...briefing.risks.map((r) => `- ${r}`),
    "",
    "RECOMMENDED ACTIONS:",
    ...briefing.recommendedActions.map((a) => `- ${a.title}: ${a.why}`),
    "",
    "ACTIVE GOALS:",
    ...snapshot.goals.map((g) => `- ${g.target} (${g.progress}/${g.targetValue})`),
    "",
    "ORCHESTRATION HINT:",
    snapshot.orchestration.amyAi.promptHint ?? "Coach on top family priority.",
    "",
    executive.narration,
    "",
    trustGuidelinesForPrompt(),
    "=== END OPERATING CONTEXT ===",
  ];
  return lines.join("\n");
}

export function getOrchestrationFromAmy(
  ctx: AmyOperatingContext,
): FamilyIntelligenceSnapshot["orchestration"] {
  return ctx.snapshot.orchestration;
}
