/**
 * Response strategy + safety flags — deterministic.
 */

import type { AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type {
  ConversationIntent,
  EncouragementLevel,
  EvidencePreference,
  ExplanationDepth,
  ResponseStrategy,
  ResponseTone,
  SafetyFlag,
} from "./types.js";

/** Always-on safety — ConversationPlan must include these. */
export const CORE_SAFETY_FLAGS: SafetyFlag[] = [
  "no_absolute_predictions",
  "no_medical_diagnosis",
  "no_financial_advice",
  "no_fear_based_statements",
  "no_deterministic_future",
  "label_tradition_as_tradition",
  "parent_audience_only",
];

const INTENT_TONE: Record<ConversationIntent, ResponseTone> = {
  parent_question: "practical",
  routine_help: "practical",
  learning_guidance: "supportive",
  sleep_guidance: "calm",
  emotional_support: "supportive",
  behaviour_guidance: "calm",
  milestone_question: "reflective",
  astrology_insight: "curious",
  general_conversation: "curious",
  unknown: "reflective",
};

export function buildResponseStrategy(input: {
  intent: ConversationIntent;
  depth: ExplanationDepth;
  adaptive?: AdaptiveSnapshot | null;
}): ResponseStrategy {
  let tone = INTENT_TONE[input.intent];
  if (input.adaptive?.profile.engagementLevel === "low") {
    tone = "calm";
  }

  const detailLevel =
    input.depth === "brief" ? "low" : input.depth === "deep" ? "high" : "medium";

  let evidencePreference: EvidencePreference = "balanced";
  if (input.intent === "astrology_insight") evidencePreference = "sky_anchors";
  else if (
    input.intent === "learning_guidance" ||
    input.intent === "milestone_question"
  ) {
    evidencePreference = "development_first";
  } else if (
    input.intent === "routine_help" ||
    input.adaptive?.profile.engagementLevel === "low"
  ) {
    evidencePreference = "adaptive_first";
  }

  let encouragementLevel: EncouragementLevel = "steady";
  if (input.intent === "emotional_support") encouragementLevel = "strong";
  if (input.intent === "behaviour_guidance") encouragementLevel = "gentle";
  if (input.adaptive?.profile.engagementLevel === "low") {
    encouragementLevel = "gentle";
  }

  const examplesAllowed =
    input.depth !== "brief" &&
    input.intent !== "unknown" &&
    input.intent !== "general_conversation";

  return {
    tone,
    audience: "parent_only",
    detailLevel,
    safetyNotes: [...CORE_SAFETY_FLAGS],
    evidencePreference,
    encouragementLevel,
    examplesAllowed,
  };
}

export function collectSafetyFlags(intent: ConversationIntent): SafetyFlag[] {
  const flags = [...CORE_SAFETY_FLAGS];
  if (intent === "astrology_insight" || intent === "milestone_question") {
    // already includes no_deterministic_future + tradition label
  }
  return flags;
}
