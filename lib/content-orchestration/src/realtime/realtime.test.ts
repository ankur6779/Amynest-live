import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  applyLiveDifficultyAdjustment,
  computeRealTimeAdjustments,
} from "../adaptiveEngine.js";
import { RealtimeEventBus } from "./eventBus.js";
import { updateAttentionState, createAttentionState } from "./attentionEngine.js";
import { evaluateRealtimeDecision } from "./realtimeDecisionEngine.js";
import { mutateSession } from "./sessionMutator.js";
import { computeDynamicExplorationRate } from "./explorationEngine.js";
import { createDefaultLearningProfile } from "../learningProfileEngine.js";
import {
  RealtimeCoordinator,
  resetGlobalRealtimeCoordinator,
} from "./realtimeCoordinator.js";
import { handleRealtimeWireMessage } from "./realtimeServer.js";
import type { RealtimeEvent, RealtimeSessionState } from "./types.js";
import type { SessionPlanItem } from "../types-v2.js";

const samplePlan: SessionPlanItem[] = [
  { slot: "warmup", moduleId: "phonics", contentId: "c1", contentType: "learning", difficulty: "easy" },
  { slot: "core", moduleId: "motor_skills", contentId: "c2", contentType: "interactive", difficulty: "medium" },
  { slot: "reward", moduleId: "stories", contentId: "c3", contentType: "fun", difficulty: "easy" },
];

function baseState(): RealtimeSessionState {
  const profile = createDefaultLearningProfile("child-rt");
  return {
    childId: "child-rt",
    sessionPlan: [...samplePlan],
    currentIndex: 0,
    profile,
    attention: createAttentionState(),
    liveDifficulty: {
      baseDifficulty: "medium",
      baseLevel: 2,
      liveLevel: 2,
      liveDifficulty: "medium",
      adjustments: 0,
    },
    recentEvents: [],
    explorationRate: 0.2,
    startedAt: Date.now(),
    lastEventAt: Date.now(),
  };
}

describe("realtime eventBus", () => {
  it("emits to subscribers", () => {
    const bus = new RealtimeEventBus();
    const seen: string[] = [];
    bus.subscribe((e) => seen.push(e.type));
    bus.emit({
      type: "CONTENT_STARTED",
      childId: "1",
      contentId: "x",
      moduleId: "phonics",
      timestamp: Date.now(),
    });
    assert.deepEqual(seen, ["CONTENT_STARTED"]);
  });
});

describe("realtimeDecisionEngine", () => {
  it("lowers difficulty after 2 consecutive skips", () => {
    const state = baseState();
    const now = Date.now();
    state.recentEvents = [
      { type: "CONTENT_SKIPPED", childId: "child-rt", contentId: "a", moduleId: "phonics", timestamp: now - 1000 },
      { type: "CONTENT_SKIPPED", childId: "child-rt", contentId: "b", moduleId: "phonics", timestamp: now - 500 },
    ];
    const decision = evaluateRealtimeDecision(
      state,
      { type: "CONTENT_SKIPPED", childId: "child-rt", contentId: "c", moduleId: "phonics", timestamp: now },
      state.attention,
    );
    assert.equal(decision.action, "ADJUST_DIFFICULTY");
    assert.equal(decision.payload.direction, "down");
  });

  it("injects reward on rapid taps", () => {
    const state = baseState();
    const decision = evaluateRealtimeDecision(
      state,
      {
        type: "RAPID_INTERACTION",
        childId: "child-rt",
        contentId: "c1",
        moduleId: "phonics",
        timestamp: Date.now(),
        metadata: { tapCount: 10 },
      },
      state.attention,
    );
    assert.equal(decision.action, "INJECT_REWARD");
  });
});

describe("sessionMutator", () => {
  it("injects reward item into plan", () => {
    const state = baseState();
    const result = mutateSession(state, {
      action: "INJECT_REWARD",
      payload: {},
      reason: "test",
    });
    assert.ok(result.applied);
    assert.ok(result.sessionPlan.length > samplePlan.length);
  });
});

describe("adaptiveEngine live difficulty", () => {
  it("adjusts level from response signals", () => {
    const adj = computeRealTimeAdjustments({ direction: "up", responseTimeMs: 800 });
    assert.ok(adj > 0);
    const live = applyLiveDifficultyAdjustment(
      { baseLevel: 2, baseDifficulty: "easy", adjustments: 0 },
      { direction: "up", delta: 0.4 },
    );
    assert.ok(live.liveLevel >= 2);
  });
});

describe("explorationEngine", () => {
  it("raises exploration when bored", () => {
    const profile = createDefaultLearningProfile("c1");
    const attention = { focusLevel: 0.3, fatigueLevel: 0.2, boredomLevel: 0.8, lastUpdated: Date.now() };
    const rate = computeDynamicExplorationRate(0.15, attention, profile);
    assert.ok(rate > 0.15);
  });
});

describe("RealtimeCoordinator", () => {
  beforeEach(() => {
    resetGlobalRealtimeCoordinator();
  });

  it("subscribe then event returns session_update", () => {
    const coordinator = new RealtimeCoordinator();
    const sub = handleRealtimeWireMessage(
      coordinator,
      JSON.stringify({ type: "subscribe", childId: "child-rt", sessionPlan: samplePlan }),
    );
    assert.equal(sub.type, "session_update");

    const update = handleRealtimeWireMessage(
      coordinator,
      JSON.stringify({
        type: "event",
        payload: {
          type: "CONTENT_SKIPPED",
          childId: "child-rt",
          contentId: "c1",
          moduleId: "phonics",
          timestamp: Date.now(),
        } satisfies RealtimeEvent,
      }),
    );
    assert.equal(update.type, "session_update");
    if (update.type === "session_update") {
      assert.ok(["ADJUST_DIFFICULTY", "SWAP_CONTENT", "INJECT_REWARD", "NOOP"].includes(update.action));
    }
  });
});

describe("attentionEngine", () => {
  it("increases boredom on idle", () => {
    const next = updateAttentionState(createAttentionState(), [
      {
        type: "USER_IDLE",
        childId: "1",
        contentId: "x",
        moduleId: "phonics",
        timestamp: Date.now(),
      },
    ]);
    assert.ok(next.boredomLevel > 0.2);
  });
});
