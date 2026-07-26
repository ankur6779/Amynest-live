/**
 * ExplainabilityEngine — reconstruct EvidenceSnapshot from pipeline snapshots.
 * Does not modify Meaning / Development / Adaptive / Conversation outputs.
 */

import { ADAPTIVE_ENGINE_VERSION } from "@workspace/birth-sky-adaptive";
import { CONVERSATION_ENGINE_VERSION } from "@workspace/birth-sky-conversation";
import { DEVELOPMENT_ENGINE_VERSION } from "@workspace/birth-sky-development";
import { MEANING_ENGINE_VERSION } from "@workspace/birth-sky-meaning";
import { buildDependencyGraph } from "./graph.js";
import { traceAdaptive } from "./trace-adaptive.js";
import { traceConversation } from "./trace-conversation.js";
import { traceDevelopment } from "./trace-development.js";
import { traceMeaning } from "./trace-meaning.js";
import {
  EVIDENCE_ENGINE_VERSION,
  type EvidenceSnapshot,
  type ExplainabilityEngineInput,
} from "./types.js";
import { buildViews } from "./views.js";

export class ExplainabilityEngine {
  readonly version = EVIDENCE_ENGINE_VERSION;

  compute(input: ExplainabilityEngineInput): EvidenceSnapshot {
    if (
      input.evidenceSnapshot &&
      input.evidenceSnapshot.evidenceEngineVersion === EVIDENCE_ENGINE_VERSION
    ) {
      return input.evidenceSnapshot;
    }

    const level = input.level ?? "debug";
    const meaningNodes = traceMeaning({
      astronomy: input.astronomy,
      meaning: input.meaning,
    });
    const developmentNodes = traceDevelopment(input.development);
    const adaptiveNodes = traceAdaptive(input.adaptive);
    const conversationNodes = traceConversation(input.conversation);

    const ruleTrace = [
      ...meaningNodes,
      ...developmentNodes,
      ...adaptiveNodes,
      ...conversationNodes,
    ].sort((a, b) => a.id.localeCompare(b.id));

    const dependencyGraph = buildDependencyGraph({
      meaning: input.meaning,
      development: input.development,
      adaptive: input.adaptive,
      conversation: input.conversation,
      ruleTrace,
    });

    const confidenceBreakdown = {
      meaning: averageConfidence(meaningNodes),
      development:
        typeof input.development?.confidence === "number"
          ? input.development.confidence
          : averageConfidence(developmentNodes),
      adaptive:
        typeof input.adaptive?.confidence === "number"
          ? input.adaptive.confidence
          : averageConfidence(adaptiveNodes),
      conversation:
        typeof input.conversation?.confidence === "number"
          ? input.conversation.confidence
          : averageConfidence(conversationNodes),
      overall: 0,
    };
    const parts = [
      confidenceBreakdown.meaning,
      confidenceBreakdown.development,
      confidenceBreakdown.adaptive,
      confidenceBreakdown.conversation,
    ].filter((x): x is number => typeof x === "number");
    confidenceBreakdown.overall =
      parts.length === 0
        ? 0
        : Math.round(
            (parts.reduce((a, b) => a + b, 0) / parts.length) * 100,
          ) / 100;

    const partial = {
      evidenceEngineVersion: EVIDENCE_ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      level,
      engineVersions: {
        meaning: input.meaning?.meaningEngineVersion ?? MEANING_ENGINE_VERSION,
        development:
          input.development?.developmentEngineVersion ??
          DEVELOPMENT_ENGINE_VERSION,
        adaptive:
          input.adaptive?.adaptiveEngineVersion ?? ADAPTIVE_ENGINE_VERSION,
        conversation:
          input.conversation?.conversationEngineVersion ??
          CONVERSATION_ENGINE_VERSION,
        evidence: EVIDENCE_ENGINE_VERSION,
      },
      ruleTrace,
      dependencyGraph,
      confidenceBreakdown,
    };

    return {
      ...partial,
      views: buildViews(partial),
    };
  }
}

function averageConfidence(
  nodes: Array<{ confidence: number }>,
): number | null {
  if (!nodes.length) return null;
  return (
    Math.round(
      (nodes.reduce((a, n) => a + n.confidence, 0) / nodes.length) * 100,
    ) / 100
  );
}

let singleton: ExplainabilityEngine | null = null;

export function getExplainabilityEngine(): ExplainabilityEngine {
  if (!singleton) singleton = new ExplainabilityEngine();
  return singleton;
}

export function computeEvidenceSnapshot(
  input: ExplainabilityEngineInput,
): EvidenceSnapshot {
  return getExplainabilityEngine().compute(input);
}

/** Env / flag gate — EvidenceSnapshot must not reach the LLM by default. */
export function shouldIncludeEvidenceInAiContext(opts?: {
  flag?: boolean | null;
  env?: Record<string, string | undefined>;
}): boolean {
  if (opts?.flag === true) return true;
  if (opts?.flag === false) return false;
  const env = opts?.env ?? (process.env as Record<string, string | undefined>);
  const v = (env.DEBUG_EXPLAINABILITY ?? "").toString().trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
