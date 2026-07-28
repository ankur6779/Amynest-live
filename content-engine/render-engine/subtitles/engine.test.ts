import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import { StoryboardPlanner } from "../../storyboard/planner.js";
import { makeContentPackage } from "../../storyboard/test-fixtures.js";
import { buildSubtitlePlan, toAss, toSrt, wrapSubtitle, writeSubtitleFiles } from "./engine.js";

describe("subtitle engine", () => {
  it("wraps long captions and preserves cue timing", () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      30,
    );
    const plan = buildSubtitlePlan(storyboard, "burned-in");

    assert.ok(plan.cues.length > 0);
    for (const cue of plan.cues) {
      assert.ok(cue.endSeconds > cue.startSeconds);
      assert.ok(cue.text.split("\n").length <= 2);
    }
    assert.ok(plan.safeMargins.bottom >= 100);

    const wrapped = wrapSubtitle(
      "This is a deliberately long caption that should wrap across two safe lines for vertical video",
      42,
    );
    assert.ok(wrapped.includes("\n"));
  });

  it("emits valid SRT and ASS with safe margins", () => {
    const config = loadDefaultConfig();
    const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
      makeContentPackage(),
      15,
    );
    const plan = buildSubtitlePlan(storyboard, "ass");
    const srt = toSrt(plan.cues);
    const ass = toAss(plan);

    assert.match(srt, /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
    assert.match(ass, /\[Script Info\]/);
    assert.match(ass, /Dialogue:/);

    const dir = mkdtempSync(join(tmpdir(), "amynest-subs-"));
    const artifacts = writeSubtitleFiles(plan, dir, "job1");
    assert.ok(artifacts.srtPath);
    assert.ok(artifacts.assPath);
    assert.ok(readFileSync(artifacts.srtPath!, "utf8").includes("-->"));
  });
});
