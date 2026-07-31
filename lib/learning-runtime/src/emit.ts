import type { LearningEventInput } from "@workspace/learning-events";
import type { LearningDecision } from "./types.js";

/** Map a runtime decision onto the unified learning event bus. */
export function toLearningDecisionEvent(
  decision: LearningDecision,
): LearningEventInput {
  return {
    type: "learning.decision",
    priority: 7,
    busOrigin: true,
    id: `dec_evt_${decision.id}`,
    payload: {
      childId: decision.childId,
      module: "learning_runtime",
      entityId: decision.nextActivity?.entityId ?? null,
      conceptId: decision.nextActivity?.conceptId ?? null,
      confidence: decision.confidence,
      difficulty: decision.difficulty,
      sessionId: null,
      timestamp: decision.timestamp,
      metadata: {
        decisionId: decision.id,
        ruleId: decision.ruleId,
        contributingRuleIds: decision.contributingRuleIds,
        reason: decision.reason,
        evidence: decision.evidence,
        nextActivity: decision.nextActivity,
        hints: decision.hints,
        celebrationLevel: decision.celebrationLevel,
        narrationLength: decision.narrationLength,
        reviewQueue: decision.reviewQueue,
        recommendation: decision.recommendation,
        breakSuggestion: decision.breakSuggestion,
        rewardPriority: decision.rewardPriority,
        sourceEventId: decision.sourceEventId,
        latencyMs: decision.latencyMs,
        schemaVersion: decision.schemaVersion,
      },
    },
  };
}
