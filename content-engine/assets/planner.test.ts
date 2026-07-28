import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectAssets, planAssetRequirements } from "./planner.js";

describe("asset planner", () => {
  it("describes requirements instead of generating binaries", () => {
    const assets = planAssetRequirements({
      sceneId: "scene-01-hook",
      purpose: "hook",
      visualType: "Promo Image",
      topicTitle: "Gentle Discipline",
      category: "Parenting",
      caption: "Start soft today",
      priority: 10,
    });
    assert.equal(assets.length, 1);
    assert.equal(assets[0]?.requiredAssetType, "Promo Image");
    assert.match(assets[0]?.imagePrompt ?? "", /Gentle Discipline/);
    assert.ok(assets[0]?.fallbackAsset);
    assert.equal(assets[0]?.videoPrompt, "");
  });

  it("collects unique assets across scenes", () => {
    const a = planAssetRequirements({
      sceneId: "scene-01-hook",
      purpose: "hook",
      visualType: "App Screen",
      topicTitle: "Speech Practice",
      category: "Speech",
      caption: "Practice words",
      priority: 9,
    });
    const collected = collectAssets([
      { assetRequirements: a },
      { assetRequirements: a },
    ]);
    assert.equal(collected.length, 1);
    assert.match(collected[0]?.screenRecordingTemplate ?? "", /speech-coach|generic-feature|amynest/);
  });
});
