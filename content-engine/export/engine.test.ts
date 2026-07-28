import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { StoryboardPlanner } from "../storyboard/planner.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { exportStoryboard } from "./engine.js";

describe("storyboard export", () => {
  it("exports deterministic JSON, YAML, and future render format", () => {
    const { package: storyboard } = new StoryboardPlanner({
      config: loadDefaultConfig(),
    }).planFromContentPackage(makeContentPackage());

    const json = exportStoryboard(storyboard, "json");
    const yaml = exportStoryboard(storyboard, "yaml");
    const render = exportStoryboard(storyboard, "amynest-render-v1");

    assert.equal(json.format, "json");
    assert.match(json.content, /"version": "3.0.0"/);
    assert.deepEqual(JSON.parse(json.content).id, storyboard.id);

    assert.equal(yaml.format, "yaml");
    assert.match(yaml.content, /\bid:/);
    assert.match(yaml.content, /version: ["']?3\.0\.0["']?/);

    assert.equal(render.format, "amynest-render-v1");
    const parsed = JSON.parse(render.content);
    assert.equal(parsed.format, "amynest-render-v1");
    assert.ok(Array.isArray(parsed.scenes));
  });
});
