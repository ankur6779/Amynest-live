import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { StoryboardPlanner } from "../storyboard/planner.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { validateStoryboard } from "./storyboard.js";

describe("storyboard validation", () => {
  it("accepts a planned storyboard package", () => {
    const { package: storyboard } = new StoryboardPlanner({
      config: loadDefaultConfig(),
    }).planFromContentPackage(makeContentPackage());

    const report = validateStoryboard(storyboard);
    assert.equal(report.ok, true, report.errors.map((e) => e.message).join("; "));
  });

  it("flags timeline and branding errors", () => {
    const { package: storyboard } = new StoryboardPlanner({
      config: loadDefaultConfig(),
    }).planFromContentPackage(makeContentPackage());

    storyboard.timeline.clips[0]!.sceneStart = 1;
    storyboard.branding.channelName = "";
    const report = validateStoryboard(storyboard);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.path.startsWith("timeline")));
    assert.ok(report.errors.some((e) => e.path === "branding.channelName"));
  });
});
