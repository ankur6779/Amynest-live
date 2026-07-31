import { beforeEach, describe, expect, it } from "vitest";
import { learningItemEvent, attentionStateEvent } from "@workspace/learning-events";
import { buildLearningEvent } from "@workspace/learning-events";
import {
  installLearningRuntimeBridge,
  processLearningRuntimeEvent,
  resetLearningRuntimeBridgeForTests,
} from "./learning-runtime-bridge";
import { resetLearningEventBusForTests } from "./learning-events-bridge";
import {
  clearLearningDecisionBus,
  subscribeLearningDecision,
} from "./learning-decision-bus";
import { resetKnowledgeGraphClient } from "./knowledge-graph-client";

describe("learning-runtime-bridge", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLearningRuntimeBridgeForTests();
    resetLearningEventBusForTests();
    resetKnowledgeGraphClient();
    clearLearningDecisionBus();
  });

  it("emits decisions to the decision bus without UI", () => {
    installLearningRuntimeBridge();
    const seen: string[] = [];
    subscribeLearningDecision((d) => seen.push(d.ruleId));

    processLearningRuntimeEvent(
      buildLearningEvent(
        attentionStateEvent({
          childId: 42,
          classification: "fatigued",
          score: 18,
        }),
        { seq: 1 },
      ),
      {
        attention: {
          score: 18,
          classification: "fatigued",
          suggestBreak: true,
        },
      },
    );

    expect(seen).toContain("attention.suggest_break");
  });

  it("processes discovery events into observable decisions", () => {
    installLearningRuntimeBridge();
    const decision = processLearningRuntimeEvent(
      buildLearningEvent(
        learningItemEvent("learning.item_recognized", {
          childId: 43,
          module: "discovery_worlds",
          entityId: "lion",
          confidence: 90,
        }),
        { seq: 1 },
      ),
    );

    expect(decision.ruleId).toBeTruthy();
    expect(decision.reason).toBeTruthy();
    expect(decision.evidence.length).toBeGreaterThan(0);
    expect(decision.timestamp).toBeTruthy();
    expect(typeof decision.confidence).toBe("number");
  });
});
