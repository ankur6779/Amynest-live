import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScenes } from "../scenes/index.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { buildTimeline } from "../timeline/index.js";
import { buildCameraPlan } from "./engine.js";

describe("camera engine", () => {
  it("assigns camera moves for every scene", () => {
    const scenes = buildScenes(makeContentPackage(), 20);
    const timeline = buildTimeline(scenes, 20);
    const { scenes: withCamera, cameraPlan } = buildCameraPlan(
      scenes,
      timeline,
      "cinematic",
    );
    assert.equal(cameraPlan.length, scenes.length);
    assert.ok(withCamera.every((s) => s.camera.length > 0));
    assert.ok(cameraPlan.every((c) => c.end >= c.start));
  });
});
