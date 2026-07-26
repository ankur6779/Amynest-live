/**
 * Conversation Intelligence Engine types — structured ConversationPlan.
 * Deterministic. No LLM. No advice prose — tags and flags only.
 */

import type { AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import type { MeaningSnapshot } from "@workspace/birth-sky-meaning";

export const CONVERSATION_ENGINE_VERSION = "conversation-engine/1.0.0" as const;

export type ConversationIntent =
  | "parent_question"
  | "routine_help"
  | "learning_guidance"
  | "sleep_guidance"
  | "emotional_support"
  | "behaviour_guidance"
  | "milestone_question"
  | "astrology_insight"
  | "general_conversation"
  | "unknown";

export type ExplanationDepth = "brief" | "medium" | "deep";

export type ResponseTone =
  | "supportive"
  | "reflective"
  | "practical"
  | "curious"
  | "calm";

export type DetailLevel = "low" | "medium" | "high";

export type EncouragementLevel = "gentle" | "steady" | "strong";

export type EvidencePreference =
  | "sky_anchors"
  | "development_first"
  | "adaptive_first"
  | "balanced";

export type SafetyFlag =
  | "no_absolute_predictions"
  | "no_medical_diagnosis"
  | "no_financial_advice"
  | "no_fear_based_statements"
  | "no_deterministic_future"
  | "label_tradition_as_tradition"
  | "parent_audience_only";

export type ConversationHistorySummary = {
  /** Prior intents (tags only). */
  recentIntents?: ConversationIntent[];
  /** Topics already covered (tags). */
  coveredTopics?: string[];
  turnCount?: number;
};

export type ResponseStrategy = {
  tone: ResponseTone;
  audience: "parent_only";
  detailLevel: DetailLevel;
  safetyNotes: SafetyFlag[];
  evidencePreference: EvidencePreference;
  encouragementLevel: EncouragementLevel;
  examplesAllowed: boolean;
};

export type ConversationPlan = {
  conversationEngineVersion: typeof CONVERSATION_ENGINE_VERSION | string;
  generatedAt: string;
  intent: ConversationIntent;
  priorityTopics: string[];
  secondaryTopics: string[];
  avoidTopics: string[];
  recommendedDepth: ExplanationDepth;
  recommendedTone: ResponseTone;
  recommendedExamples: string[];
  recommendedOrder: string[];
  strategy: ResponseStrategy;
  safetyFlags: SafetyFlag[];
  confidence: number;
  /** Compact keys for AI facts. */
  profile: {
    intent: ConversationIntent;
    depth: ExplanationDepth;
    tone: ResponseTone;
    priority: string;
    avoid: string;
    order: string;
  };
};

export type ConversationEngineInput = {
  meaning?: MeaningSnapshot | null;
  development?: DevelopmentSnapshot | null;
  adaptive?: AdaptiveSnapshot | null;
  /** Raw parent question text. */
  userQuestion: string;
  /** UI entry point tag (sky, reflect, etc.). */
  entryPoint?: string | null;
  historySummary?: ConversationHistorySummary | null;
  /** Prefer existing plan when same engine version. */
  conversationPlan?: ConversationPlan | null;
};
