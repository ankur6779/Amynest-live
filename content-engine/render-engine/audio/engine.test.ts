import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import { StoryboardPlanner } from "../../storyboard/planner.js";
import { makeContentPackage } from "../../storyboard/test-fixtures.js";
import { buildAudioMixPlan, validateAudioSync } from "./engine.js";

describe("audio engine", () => {
  it("builds narration, music, and sfx tracks with ducking and fades", () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      30,
    );
    const plan = buildAudioMixPlan(storyboard);

    assert.ok(plan.tracks.some((t) => t.role === "narration"));
    assert.ok(plan.tracks.some((t) => t.role === "music"));
    assert.equal(plan.normalize, true);
    assert.ok(plan.duckingLevel > 0);

    for (const track of plan.tracks) {
      assert.ok(track.endSeconds > track.startSeconds);
      assert.ok(track.fadeInSeconds >= 0);
      assert.ok(track.fadeOutSeconds >= 0);
      assert.ok(track.volume > 0 && track.volume <= 1.5);
    }

    const issues = validateAudioSync(plan, storyboard.timeline.totalDuration);
    assert.deepEqual(issues, []);
  });

  it("flags tracks that overrun composition duration", () => {
    const plan = buildAudioMixPlan(
      new StoryboardPlanner({ config: loadDefaultConfig() }).planFromContentPackage(
        makeContentPackage(),
        15,
      ).package,
    );
    plan.tracks[0]!.endSeconds = 999;
    const issues = validateAudioSync(plan, 15);
    assert.ok(issues.some((i) => i.includes("ends after")));
  });
});
