import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScenes } from "../scenes/index.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import {
  assertTimelineIntegrity,
  buildTimeline,
  resolveSupportedDuration,
} from "./engine.js";

describe("timeline engine", () => {
  it("snaps durations to 15, 20, or 30 seconds", () => {
    assert.equal(resolveSupportedDuration(14), 15);
    assert.equal(resolveSupportedDuration(18), 20);
    assert.equal(resolveSupportedDuration(27), 30);
  });

  it("builds a contiguous timeline with no gaps or overlaps", () => {
    for (const duration of [15, 20, 30] as const) {
      const scenes = buildScenes(makeContentPackage({ estimatedDuration: duration }), duration);
      const timeline = buildTimeline(scenes, duration);
      assert.equal(timeline.totalDuration, duration);
      assert.equal(timeline.clips.length, scenes.length);
      assert.deepEqual(assertTimelineIntegrity(timeline), []);
      assert.equal(timeline.clips[0]?.sceneStart, 0);
      assert.equal(timeline.clips.at(-1)?.sceneEnd, duration);
    }
  });
});
