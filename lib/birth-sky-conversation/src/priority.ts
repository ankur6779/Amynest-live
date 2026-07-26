/**
 * Priority engine — topics to explain / avoid + depth from snapshots + intent.
 */

import type { AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import type { MeaningSnapshot } from "@workspace/birth-sky-meaning";
import type {
  ConversationHistorySummary,
  ConversationIntent,
  ExplanationDepth,
} from "./types.js";

const BASE_AVOID = [
  "fatalistic_prediction",
  "medical_diagnosis",
  "financial_advice",
  "fear_based_framing",
  "deterministic_future",
];

const INTENT_PRIMARY: Record<ConversationIntent, string[]> = {
  parent_question: ["parenting_moves", "strengths", "comfort_needs"],
  routine_help: ["routine_health", "routine_adaptability", "consistency"],
  learning_guidance: ["attention", "learning_style", "curiosity"],
  sleep_guidance: ["sleep_tendencies", "wind_down", "predictable_routines"],
  emotional_support: ["emotional_regulation", "comfort_needs", "co_regulation"],
  behaviour_guidance: ["emotional_regulation", "boundaries", "social_interaction"],
  milestone_question: ["development_stage", "capabilities", "motor_or_language"],
  astrology_insight: ["sun_moon_rising", "meaning_strengths", "tradition_label"],
  general_conversation: ["strengths", "curiosity", "gentle_noticing"],
  unknown: ["strengths", "comfort_needs"],
};

const INTENT_SECONDARY: Record<ConversationIntent, string[]> = {
  parent_question: ["communication", "motivation"],
  routine_help: ["sleep_tendencies", "attention"],
  learning_guidance: ["recommended_session_length", "preferred_activities"],
  sleep_guidance: ["emotional_regulation", "routine_health"],
  emotional_support: ["social_interaction", "encouragement"],
  behaviour_guidance: ["communication", "routine_cues"],
  milestone_question: ["curiosity", "confidence"],
  astrology_insight: ["learning_style", "emotional_profile"],
  general_conversation: ["development_stage"],
  unknown: ["development_stage"],
};

export function buildTopicPlan(input: {
  intent: ConversationIntent;
  meaning?: MeaningSnapshot | null;
  development?: DevelopmentSnapshot | null;
  adaptive?: AdaptiveSnapshot | null;
  historySummary?: ConversationHistorySummary | null;
}): {
  priorityTopics: string[];
  secondaryTopics: string[];
  avoidTopics: string[];
  recommendedDepth: ExplanationDepth;
  recommendedOrder: string[];
  recommendedExamples: string[];
} {
  const priorityTopics = [...INTENT_PRIMARY[input.intent]];
  const secondaryTopics = [...INTENT_SECONDARY[input.intent]];

  // Boost from development top priorities
  for (const p of input.development?.profile.topPriorities.slice(0, 3) ?? []) {
    const tag = toTag(p);
    if (tag && !priorityTopics.includes(tag)) {
      if (priorityTopics.length < 5) priorityTopics.push(tag);
      else if (!secondaryTopics.includes(tag)) secondaryTopics.push(tag);
    }
  }

  // Adaptive engagement cues
  if (input.adaptive?.profile.engagementLevel === "low") {
    if (!priorityTopics.includes("short_session")) {
      priorityTopics.unshift("short_session");
    }
    secondaryTopics.push("gentle_pacing");
  }
  if (input.adaptive?.profile.routineHealthLabel === "needs_support") {
    if (!priorityTopics.includes("routine_health")) {
      priorityTopics.push("routine_health");
    }
  }

  // Meaning strengths as examples / secondary
  const recommendedExamples: string[] = [];
  for (const s of input.meaning?.profile.strengths.slice(0, 3) ?? []) {
    const tag = toTag(s);
    if (tag) recommendedExamples.push(`strength:${tag}`);
  }
  for (const a of input.adaptive?.profile.preferredActivityTypes.slice(0, 2) ?? []) {
    recommendedExamples.push(`activity:${a}`);
  }

  const covered = new Set(
    (input.historySummary?.coveredTopics ?? []).map((t) => toTag(t)).filter(Boolean),
  );
  // Demote already-covered priority topics to secondary
  const freshPrimary = priorityTopics.filter((t) => !covered.has(t));
  const demoted = priorityTopics.filter((t) => covered.has(t));
  const finalPrimary = (freshPrimary.length ? freshPrimary : priorityTopics).slice(
    0,
    5,
  );
  const finalSecondary = [
    ...secondaryTopics,
    ...demoted,
  ]
    .filter((t, i, arr) => arr.indexOf(t) === i && !finalPrimary.includes(t))
    .slice(0, 5);

  const avoidTopics = [
    ...BASE_AVOID,
    ...(input.adaptive?.learningPreferences.avoidedActivities.map(
      (a) => `forced_${a}`,
    ) ?? []),
  ].slice(0, 10);

  const recommendedDepth = selectDepth({
    intent: input.intent,
    adaptive: input.adaptive,
    turnCount: input.historySummary?.turnCount,
  });

  const recommendedOrder = [
    "name_sky_anchors",
    ...finalPrimary.map((t) => `explain:${t}`),
    ...finalSecondary.slice(0, 2).map((t) => `touch:${t}`),
    "one_parent_move",
    "optional_reflective_question",
  ].slice(0, 10);

  return {
    priorityTopics: finalPrimary,
    secondaryTopics: finalSecondary,
    avoidTopics,
    recommendedDepth,
    recommendedOrder,
    recommendedExamples: recommendedExamples.slice(0, 6),
  };
}

function selectDepth(input: {
  intent: ConversationIntent;
  adaptive?: AdaptiveSnapshot | null;
  turnCount?: number;
}): ExplanationDepth {
  if (
    input.intent === "general_conversation" ||
    input.intent === "unknown"
  ) {
    return "brief";
  }
  if (input.adaptive?.profile.engagementLevel === "low") {
    return "brief";
  }
  if (
    input.intent === "astrology_insight" ||
    input.intent === "milestone_question"
  ) {
    return "medium";
  }
  if (
    input.intent === "emotional_support" ||
    input.intent === "behaviour_guidance"
  ) {
    return input.adaptive?.profile.engagementLevel === "high" ? "deep" : "medium";
  }
  if ((input.turnCount ?? 0) >= 4) return "brief";
  if (input.adaptive?.profile.engagementLevel === "high") return "deep";
  return "medium";
}

function toTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
