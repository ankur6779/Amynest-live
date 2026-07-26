/**
 * A/B experiments — presentation overrides only.
 * Deterministic engines are never modified; we only adjust AI-facing plan tags.
 */

import type { ConversationPlan } from "@workspace/birth-sky-conversation";
import type { ExperimentArm, ExperimentAssignment } from "./types.js";

const DEFAULT_EXPERIMENT_ID = "birth_sky_response_presentation_v1";

const ARMS: ExperimentArm[] = [
  {
    id: "control",
    conversationDepthBias: null,
    exampleRichness: "medium",
    responseLengthBias: "standard",
    explanationOrder: "default",
  },
  {
    id: "brief_actions_first",
    conversationDepthBias: "brief",
    exampleRichness: "low",
    responseLengthBias: "short",
    explanationOrder: "actions_first",
  },
  {
    id: "rich_sky_first",
    conversationDepthBias: "deep",
    exampleRichness: "high",
    responseLengthBias: "long",
    explanationOrder: "sky_first",
  },
];

/** Stable bucket 0–99 from request id (no PII). */
export function bucketFromRequestId(requestId: string): number {
  let h = 0;
  for (let i = 0; i < requestId.length; i++) {
    h = (h * 31 + requestId.charCodeAt(i)) >>> 0;
  }
  return h % 100;
}

export function assignExperiment(input: {
  requestId: string;
  enabled?: boolean;
  experimentId?: string;
}): ExperimentAssignment | null {
  if (input.enabled === false) return null;
  const envOff =
    (process.env.BIRTH_SKY_EXPERIMENTS ?? "1").toLowerCase() === "0" ||
    (process.env.BIRTH_SKY_EXPERIMENTS ?? "").toLowerCase() === "false";
  if (envOff && input.enabled !== true) return null;

  const bucket = bucketFromRequestId(input.requestId);
  // 40% control, 30% brief, 30% rich
  let arm = ARMS[0]!;
  if (bucket >= 40 && bucket < 70) arm = ARMS[1]!;
  else if (bucket >= 70) arm = ARMS[2]!;

  return {
    experimentId: input.experimentId ?? DEFAULT_EXPERIMENT_ID,
    armId: arm.id,
    arm,
  };
}

/**
 * Apply presentation overrides onto a ConversationPlan copy.
 * Engine output remains the source; this only reshapes AI facts.
 */
export function applyExperimentToConversationPlan(
  plan: ConversationPlan,
  assignment: ExperimentAssignment | null,
): ConversationPlan {
  if (!assignment) return plan;
  const arm = assignment.arm;
  const next: ConversationPlan = {
    ...plan,
    recommendedDepth: arm.conversationDepthBias ?? plan.recommendedDepth,
    recommendedTone: plan.recommendedTone,
    recommendedExamples:
      arm.exampleRichness === "low"
        ? plan.recommendedExamples.slice(0, 1)
        : arm.exampleRichness === "high"
          ? plan.recommendedExamples
          : plan.recommendedExamples.slice(0, 3),
    recommendedOrder: reorderExplanation(
      plan.recommendedOrder,
      arm.explanationOrder ?? "default",
    ),
    strategy: {
      ...plan.strategy,
      examplesAllowed:
        arm.exampleRichness === "low" ? false : plan.strategy.examplesAllowed,
      detailLevel:
        arm.responseLengthBias === "short"
          ? "low"
          : arm.responseLengthBias === "long"
            ? "high"
            : plan.strategy.detailLevel,
    },
    profile: {
      ...plan.profile,
      depth: arm.conversationDepthBias ?? plan.profile.depth,
      order: "",
    },
  };
  next.profile.order = next.recommendedOrder.slice(0, 4).join(">");
  return next;
}

function reorderExplanation(
  order: string[],
  mode: NonNullable<ExperimentArm["explanationOrder"]>,
): string[] {
  if (mode === "default" || order.length < 2) return order;
  const copy = [...order];
  if (mode === "actions_first") {
    const idx = copy.indexOf("one_parent_move");
    if (idx > 0) {
      copy.splice(idx, 1);
      copy.splice(1, 0, "one_parent_move");
    }
    return copy;
  }
  if (mode === "sky_first") {
    const idx = copy.indexOf("name_sky_anchors");
    if (idx > 0) {
      copy.splice(idx, 1);
      copy.unshift("name_sky_anchors");
    }
    return copy;
  }
  return copy;
}

export function listExperimentArms(): ExperimentArm[] {
  return ARMS.map((a) => ({ ...a }));
}
