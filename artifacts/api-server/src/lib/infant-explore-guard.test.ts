import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isInfantAgeMonths } from "./infant-age.js";
import {
  EXPLORE_NEXT_STAGE_TILE_IDS,
  EXPLORE_NEXT_STAGE_HUB_FEATURES,
  isExploreLoadMoreSection,
  isExploreNextStageHubFeature,
} from "./infant-explore-modules.js";

describe("infant explore guard — age months", () => {
  it("allows mutations at 24+ months", () => {
    for (const age of [24, 30, 48, 72]) {
      assert.equal(isInfantAgeMonths(age), false, `${age}m`);
    }
  });

  it("blocks mutations under 24 months", () => {
    for (const age of [0, 6, 12, 18, 23]) {
      assert.equal(isInfantAgeMonths(age), true, `${age}m should be infant`);
    }
  });
});

describe("infant explore modules registry", () => {
  it("lists all 10 Explore Next Stage tiles", () => {
    assert.equal(EXPLORE_NEXT_STAGE_TILE_IDS.length, 10);
    assert.ok(EXPLORE_NEXT_STAGE_TILE_IDS.includes("phonics"));
    assert.ok(EXPLORE_NEXT_STAGE_TILE_IDS.includes("abacus"));
    assert.ok(EXPLORE_NEXT_STAGE_TILE_IDS.includes("smart-math-tricks"));
  });

  it("maps hub features for quota tracking", () => {
    assert.equal(EXPLORE_NEXT_STAGE_HUB_FEATURES.length, 10);
    assert.ok(isExploreNextStageHubFeature("hub_phonics"));
    assert.equal(isExploreNextStageHubFeature("hub_articles"), false);
  });

  it("recognizes explore load-more sections", () => {
    assert.ok(isExploreLoadMoreSection("smart_math_tricks"));
    assert.ok(isExploreLoadMoreSection("olympiad"));
    assert.equal(isExploreLoadMoreSection("spelling"), false);
  });
});
