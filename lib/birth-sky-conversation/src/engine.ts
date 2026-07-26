/**
 * ConversationEngine — snapshots + intent → ConversationPlan.
 * Deterministic. No LLM.
 */

import { classifyIntent } from "./intent.js";
import { buildTopicPlan } from "./priority.js";
import { buildResponseStrategy, collectSafetyFlags } from "./strategy.js";
import {
  CONVERSATION_ENGINE_VERSION,
  type ConversationEngineInput,
  type ConversationPlan,
} from "./types.js";

export class ConversationEngine {
  readonly version = CONVERSATION_ENGINE_VERSION;

  compute(input: ConversationEngineInput): ConversationPlan {
    if (
      input.conversationPlan &&
      input.conversationPlan.conversationEngineVersion ===
        CONVERSATION_ENGINE_VERSION
    ) {
      return input.conversationPlan;
    }

    const { intent, confidence: intentConfidence } = classifyIntent({
      userQuestion: input.userQuestion,
      entryPoint: input.entryPoint,
    });

    const topics = buildTopicPlan({
      intent,
      meaning: input.meaning,
      development: input.development,
      adaptive: input.adaptive,
      historySummary: input.historySummary,
    });

    const strategy = buildResponseStrategy({
      intent,
      depth: topics.recommendedDepth,
      adaptive: input.adaptive,
    });

    const safetyFlags = collectSafetyFlags(intent);

    let confidence = intentConfidence;
    if (input.meaning) confidence = Math.min(0.95, confidence + 0.05);
    if (input.development) confidence = Math.min(0.95, confidence + 0.05);
    if (input.adaptive) confidence = Math.min(0.95, confidence + 0.03);
    confidence = Math.round(confidence * 100) / 100;

    const priority = topics.priorityTopics[0] ?? "strengths";
    const avoid = topics.avoidTopics[0] ?? "fatalistic_prediction";

    return {
      conversationEngineVersion: CONVERSATION_ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      intent,
      priorityTopics: topics.priorityTopics,
      secondaryTopics: topics.secondaryTopics,
      avoidTopics: topics.avoidTopics,
      recommendedDepth: topics.recommendedDepth,
      recommendedTone: strategy.tone,
      recommendedExamples: topics.recommendedExamples,
      recommendedOrder: topics.recommendedOrder,
      strategy,
      safetyFlags,
      confidence,
      profile: {
        intent,
        depth: topics.recommendedDepth,
        tone: strategy.tone,
        priority,
        avoid,
        order: topics.recommendedOrder.slice(0, 4).join(">"),
      },
    };
  }
}

let singleton: ConversationEngine | null = null;

export function getConversationEngine(): ConversationEngine {
  if (!singleton) singleton = new ConversationEngine();
  return singleton;
}

export function computeConversationPlan(
  input: ConversationEngineInput,
): ConversationPlan {
  return getConversationEngine().compute(input);
}
