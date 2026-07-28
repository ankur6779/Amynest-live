import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScenes } from "../scenes/index.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { buildTimeline } from "../timeline/index.js";
import { buildTransitionPlan } from "./engine.js";

describe("transition engine", () => {
  it("plans transitions between adjacent scenes", () => {
    const scenes = buildScenes(makeContentPackage(), 20);
    const timeline = buildTimeline(scenes, 20);
    const { transitionPlan, scenes: withTransitions } = buildTransitionPlan(
      scenes,
      timeline,
      ["Cut", "Fade", "Slide"],
    );
    assert.equal(transitionPlan.length, scenes.length - 1);
    assert.ok(transitionPlan.every((t) => t.duration >= 0));
    assert.ok(withTransitions[0]?.transition);
  });
});
