/**
 * Reconstruct conversation plan traces.
 */

import {
  CONVERSATION_ENGINE_VERSION,
  type ConversationPlan,
} from "@workspace/birth-sky-conversation";
import { ruleRef } from "./rule-ids.js";
import type { EvidenceNode } from "./types.js";

export function traceConversation(
  conversation?: ConversationPlan | null,
): EvidenceNode[] {
  if (!conversation) return [];
  const version =
    conversation.conversationEngineVersion || CONVERSATION_ENGINE_VERSION;
  const nodes: EvidenceNode[] = [];

  nodes.push({
    id: `conversation:intent:${conversation.intent}`,
    label: conversation.intent,
    engine: "conversation",
    engineVersion: version,
    rules: [ruleRef("C", `intent_${conversation.intent}`)],
    supportingFacts: [
      `depth=${conversation.recommendedDepth}`,
      `tone=${conversation.recommendedTone}`,
    ],
    confidence: conversation.confidence,
    dependencies: ["user_question", "entry_point"],
  });

  for (const t of conversation.priorityTopics.slice(0, 6)) {
    nodes.push({
      id: `conversation:priority:${t}`,
      label: t,
      engine: "conversation",
      engineVersion: version,
      rules: [ruleRef("C", `priority_${t}`)],
      supportingFacts: [`intent=${conversation.intent}`],
      confidence: conversation.confidence,
      dependencies: [
        `conversation:intent:${conversation.intent}`,
        "development_priorities",
        "adaptive_profile",
      ],
    });
  }

  for (const a of conversation.avoidTopics.slice(0, 6)) {
    nodes.push({
      id: `conversation:avoid:${a}`,
      label: a,
      engine: "conversation",
      engineVersion: version,
      rules: [ruleRef("C", `avoid_${a}`)],
      supportingFacts: ["safety_policy"],
      confidence: 1,
      dependencies: ["safety_flags"],
    });
  }

  for (const flag of conversation.safetyFlags.slice(0, 8)) {
    nodes.push({
      id: `conversation:safety:${flag}`,
      label: flag,
      engine: "conversation",
      engineVersion: version,
      rules: [ruleRef("C", `safety_${flag}`)],
      supportingFacts: ["core_safety"],
      confidence: 1,
      dependencies: [`conversation:intent:${conversation.intent}`],
    });
  }

  return nodes.sort((a, b) => a.id.localeCompare(b.id));
}
