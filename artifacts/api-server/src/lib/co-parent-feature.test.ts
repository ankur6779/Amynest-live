import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  isCoParentFeatureEnabled,
  resetCoParentFeatureForTests,
} from "./co-parent-feature.js";

describe("co-parent-feature", () => {
  beforeEach(() => {
    resetCoParentFeatureForTests();
  });

  it("defaults to disabled when env unset", () => {
    assert.equal(isCoParentFeatureEnabled(), false);
  });

  it("enables only for 1 or true", () => {
    process.env.CO_PARENT_FEATURE_ENABLED = "1";
    assert.equal(isCoParentFeatureEnabled(), true);

    process.env.CO_PARENT_FEATURE_ENABLED = "true";
    assert.equal(isCoParentFeatureEnabled(), true);

    process.env.CO_PARENT_FEATURE_ENABLED = "TRUE";
    assert.equal(isCoParentFeatureEnabled(), true);
  });

  it("stays disabled for other values", () => {
    process.env.CO_PARENT_FEATURE_ENABLED = "0";
    assert.equal(isCoParentFeatureEnabled(), false);

    process.env.CO_PARENT_FEATURE_ENABLED = "false";
    assert.equal(isCoParentFeatureEnabled(), false);
  });
});
