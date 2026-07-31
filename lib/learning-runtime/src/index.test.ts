import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLearningEventBus,
  learningItemEvent,
  speechPracticeEvent,
  attentionStateEvent,
  knowledgeUpdatedEvent,
  buildLearningEvent,
} from "@workspace/learning-events";
import {
  createLearningRuntime,
  toLearningDecisionEvent,
  DEFAULT_RUNTIME_RULES,
  evaluateCondition,
  type RuleContext,
} from "./index.js";
import { createChildRuntimeState } from "./state.js";
import { normalizeLearningEvent } from "./normalize.js";

function asEvent(
  input: Parameters<typeof buildLearningEvent>[0],
  seq = 1,
) {
  return buildLearningEvent(input, { seq });
}

test("pipeline: success streak raises celebration and difficulty", () => {
  const runtime = createLearningRuntime();
  let decision = runtime.processEvent(
    asEvent(
      learningItemEvent("learning.item_recognized", {
        childId: 1,
        module: "discovery_worlds",
        entityId: "lion",
        confidence: 90,
      }),
    ),
  ).decision;
  decision = runtime.processEvent(
    asEvent(
      learningItemEvent("learning.item_recognized", {
        childId: 1,
        module: "discovery_worlds",
        entityId: "tiger",
        confidence: 92,
      }),
      2,
    ),
  ).decision;
  decision = runtime.processEvent(
    asEvent(
      learningItemEvent("learning.item_recognized", {
        childId: 1,
        module: "discovery_worlds",
        entityId: "leopard",
        confidence: 95,
      }),
      3,
    ),
  ).decision;

  assert.ok(decision.celebrationLevel >= 2);
  assert.equal(decision.difficulty, "harder");
  assert.ok(decision.ruleId);
  assert.ok(decision.evidence.length > 0);
  assert.ok(decision.reason.length > 0);
  assert.ok(typeof decision.confidence === "number");
  assert.ok(decision.timestamp);
});

test("attention fatigued → break suggestion", () => {
  const runtime = createLearningRuntime();
  const { decision } = runtime.processEvent(
    asEvent(
      attentionStateEvent({
        childId: 2,
        classification: "fatigued",
        score: 22,
        worldId: "nature_world",
      }),
    ),
    {
      attention: {
        score: 22,
        classification: "fatigued",
        suggestBreak: true,
        taskDifficulty: "easier",
      },
    },
  );

  assert.equal(decision.breakSuggestion, true);
  assert.equal(decision.nextActivity?.kind, "break");
  assert.equal(decision.difficulty, "easier");
  assert.equal(decision.ruleId, "attention.suggest_break");
});

test("speech low score → guided hints via dependency rule", () => {
  const runtime = createLearningRuntime();
  const { decision } = runtime.processEvent(
    asEvent(
      speechPracticeEvent("completed", {
        childId: 3,
        confidence: 40,
        metadata: { promptText: "Lion" },
      }),
    ),
  );

  assert.equal(decision.hints, "guided");
  assert.equal(decision.difficulty, "easier");
  assert.ok(decision.contributingRuleIds.includes("speech.completed_route"));
  assert.ok(decision.contributingRuleIds.includes("speech.low_score_hints"));
});

test("knowledge snapshot enriches review queue", () => {
  const runtime = createLearningRuntime();
  const { decision } = runtime.processEvent(
    asEvent(
      knowledgeUpdatedEvent({
        childId: 4,
        conceptId: "entity:lion",
        confidence: 80,
      }),
    ),
    {
      knowledge: {
        forgottenNodeIds: ["entity:tiger"],
        topRecommendations: [
          {
            nodeId: "entity:leopard",
            label: "Leopard",
            reason: "related_to_known",
            score: 88,
            links: { discoveryWorldId: "animal_world", discoveryItemId: "leopard" },
          },
        ],
      },
    },
  );

  assert.ok(
    decision.reviewQueue.some((r) => r.conceptId === "entity:tiger") ||
      decision.nextActivity?.kind === "review" ||
      decision.recommendation != null,
  );
  assert.ok(decision.ruleId);
});

test("learning.decision echo does not loop", () => {
  const runtime = createLearningRuntime();
  const first = runtime.processEvent(
    asEvent(
      learningItemEvent("learning.item_heard", {
        childId: 5,
        module: "animal_world",
        entityId: "cow",
      }),
    ),
  ).decision;

  const echo = asEvent(toLearningDecisionEvent(first), 9);
  const second = runtime.processEvent(echo).decision;
  assert.equal(second.ruleId, "runtime.ignore_echo");
  assert.equal(second.confidence, 0);
});

test("feature flag disables attention break rule", () => {
  const runtime = createLearningRuntime({
    featureFlags: { "runtime.attention_break": false },
  });
  const { decision } = runtime.processEvent(
    asEvent(
      attentionStateEvent({
        childId: 6,
        classification: "fatigued",
        score: 10,
      }),
    ),
  );
  assert.notEqual(decision.ruleId, "attention.suggest_break");
});

test("cooldown prevents re-fire within window", () => {
  let now = 1_000_000;
  const runtime = createLearningRuntime({
    now: () => new Date(now),
  });
  const event = asEvent(
    attentionStateEvent({
      childId: 7,
      classification: "fatigued",
      score: 15,
    }),
  );
  const a = runtime.processEvent(event).decision;
  assert.equal(a.ruleId, "attention.suggest_break");

  now += 1_000; // within 60s cooldown
  const b = runtime.processEvent(
    asEvent(
      attentionStateEvent({
        childId: 7,
        classification: "fatigued",
        score: 12,
      }),
      2,
    ),
  ).decision;
  assert.notEqual(b.ruleId, "attention.suggest_break");
});

test("decision latency under 5ms for typical event", () => {
  const runtime = createLearningRuntime();
  const samples: number[] = [];
  for (let i = 0; i < 50; i++) {
    const { decision } = runtime.processEvent(
      asEvent(
        learningItemEvent("learning.item_heard", {
          childId: 8,
          module: "discovery_worlds",
          entityId: `item-${i}`,
        }),
        i + 1,
      ),
      {
        knowledge: {
          topRecommendations: [
            {
              nodeId: "entity:lion",
              label: "Lion",
              reason: "related",
              score: 70,
            },
          ],
        },
        attention: { score: 70, classification: "focused" },
        skills: [{ skillId: "speech_clear_sounds", mastery: 40, confidence: 50 }],
      },
    );
    samples.push(decision.latencyMs ?? 99);
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const max = Math.max(...samples);
  assert.ok(avg < 5, `avg latency ${avg}ms`);
  assert.ok(max < 15, `max latency ${max}ms (CI noise budget)`);
});

test("emit helper produces learning.decision bus event", () => {
  const runtime = createLearningRuntime();
  const { decision } = runtime.processEvent(
    asEvent(
      learningItemEvent("learning.item_mastered", {
        childId: 9,
        module: "reading",
        entityId: "cat",
      }),
    ),
  );
  const input = toLearningDecisionEvent(decision);
  assert.equal(input.type, "learning.decision");
  assert.equal(input.busOrigin, true);
  assert.equal(input.payload.module, "learning_runtime");
  assert.equal(input.payload.metadata?.ruleId, decision.ruleId);

  const bus = createLearningEventBus();
  const seen: string[] = [];
  bus.subscribe((e) => seen.push(e.type));
  bus.publish(input);
  assert.deepEqual(seen, ["learning.decision"]);
});

test("default rule pack is non-empty and conditions evaluate", () => {
  assert.ok(DEFAULT_RUNTIME_RULES.length >= 8);
  const signal = normalizeLearningEvent(
    asEvent(
      learningItemEvent("learning.item_seen", {
        childId: 10,
        module: "games",
        entityId: "x",
      }),
    ),
  );
  const ctx: RuleContext = {
    signal,
    state: createChildRuntimeState("10"),
    snapshots: {},
    nowMs: Date.now(),
    featureFlags: {},
  };
  assert.equal(
    evaluateCondition({ op: "eq", path: "signal.type", value: "learning.item_seen" }, ctx),
    true,
  );
});
