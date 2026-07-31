import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLearningEvent,
  learningItemEvent,
  attentionStateEvent,
} from "@workspace/learning-events";
import {
  createLearningRuntime,
  evaluateRulesDetailed,
  type RuntimeTraceFrame,
} from "./index.js";
import { createChildRuntimeState } from "./state.js";
import { normalizeLearningEvent } from "./normalize.js";
import { DEFAULT_RUNTIME_RULES } from "./rule-pack.js";

test("tracer receives matched + skipped rules; no tracer keeps fast path", () => {
  const frames: RuntimeTraceFrame[] = [];
  const runtime = createLearningRuntime();
  runtime.setTracer((f) => frames.push(f));

  runtime.processEvent(
    buildLearningEvent(
      attentionStateEvent({
        childId: 1,
        classification: "fatigued",
        score: 20,
      }),
      { seq: 1 },
    ),
  );

  assert.equal(frames.length, 1);
  assert.ok(frames[0]!.matchedRules.some((m) => m.ruleId === "attention.suggest_break"));
  assert.ok(frames[0]!.skippedRules.length > 0);
  assert.ok(frames[0]!.latencyMs >= 0);
  assert.equal(frames[0]!.snapshotVersion, 1);

  runtime.setTracer(null);
  const before = frames.length;
  runtime.processEvent(
    buildLearningEvent(
      learningItemEvent("learning.item_heard", {
        childId: 1,
        module: "discovery_worlds",
        entityId: "lion",
      }),
      { seq: 2 },
    ),
  );
  assert.equal(frames.length, before);
});

test("evaluateRulesDetailed reports feature_flag_off skips", () => {
  const event = buildLearningEvent(
    attentionStateEvent({
      childId: 2,
      classification: "fatigued",
      score: 10,
    }),
    { seq: 1 },
  );
  const signal = normalizeLearningEvent(event);
  const detailed = evaluateRulesDetailed(DEFAULT_RUNTIME_RULES, {
    signal,
    state: createChildRuntimeState("2"),
    snapshots: {},
    nowMs: Date.now(),
    featureFlags: { "runtime.attention_break": false },
  });
  assert.ok(
    detailed.skipped.some(
      (s) => s.ruleId === "attention.suggest_break" && s.reason === "feature_flag_off",
    ),
  );
});
