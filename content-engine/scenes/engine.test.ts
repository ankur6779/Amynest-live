import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { buildSceneBlueprints, buildScenes } from "./engine.js";

describe("scene engine", () => {
  it("scales scene count with duration and includes required purposes", () => {
    const pkg = makeContentPackage();
    const short = buildSceneBlueprints(pkg, 15);
    const medium = buildSceneBlueprints(pkg, 20);
    const long = buildSceneBlueprints(pkg, 30);

    assert.ok(short.length < medium.length);
    assert.ok(medium.length <= long.length);
    assert.ok(short.some((s) => s.purpose === "hook"));
    assert.ok(short.some((s) => s.purpose === "cta"));
    assert.ok(short.some((s) => s.purpose === "brand-end"));
    assert.ok(long.some((s) => s.purpose === "brand-end"));
    // Mandatory AmyNest brand spine present at every duration.
    for (const pack of [short, medium, long]) {
      assert.ok(pack.some((s) => s.purpose === "opening-question"));
      assert.ok(pack.some((s) => s.purpose === "story"));
      assert.ok(pack.some((s) => s.purpose === "key-point"));
    }
  });

  it("creates scenes with visual types and asset requirements", () => {
    const scenes = buildScenes(makeContentPackage(), 30);
    assert.ok(scenes.length >= 5);
    for (const scene of scenes) {
      assert.ok(scene.sceneId.startsWith("scene-"));
      assert.ok(scene.visualType.length > 0);
      assert.ok(scene.assetRequirements.length >= 1);
      assert.ok(scene.emotion.length > 0);
    }
  });
});
