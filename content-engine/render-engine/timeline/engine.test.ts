import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import { StoryboardPlanner } from "../../storyboard/planner.js";
import { makeContentPackage } from "../../storyboard/test-fixtures.js";
import { buildFrameTimeline, buildTransitionSpecs } from "./engine.js";

describe("render frame timeline", () => {
  it("builds a gap-free frame-accurate timeline at 30fps", () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      15,
    );

    const timeline = buildFrameTimeline(storyboard, 30);
    assert.equal(timeline.fps, 30);
    assert.equal(timeline.totalFrames, Math.round(15 * 30));
    assert.equal(timeline.clips[0]!.startFrame, 0);

    let cursor = 0;
    for (const clip of timeline.clips) {
      assert.equal(clip.startFrame, cursor);
      assert.ok(clip.endFrame > clip.startFrame);
      cursor = clip.endFrame;
    }
    assert.equal(cursor, timeline.totalFrames);
  });

  it("maps all transition types onto the frame timeline", () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      20,
    );
    const timeline = buildFrameTimeline(storyboard, 30);
    const transitions = buildTransitionSpecs(storyboard, timeline);

    assert.ok(transitions.length >= 1);
    for (const transition of transitions) {
      assert.ok(
        ["Cut", "Fade", "Crossfade", "Slide", "Zoom", "Dissolve"].includes(transition.type),
      );
      assert.ok(Number.isInteger(transition.atFrame));
      assert.ok(transition.durationFrames >= 0);
    }
  });

  it("rejects overlapping frame clips", () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      15,
    );
    storyboard.timeline.clips[1]!.sceneStart = storyboard.timeline.clips[0]!.sceneStart;

    assert.throws(() => buildFrameTimeline(storyboard, 30), /gap\/overlap|Invalid storyboard/);
  });
});
