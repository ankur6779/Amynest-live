import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isInfantAgeMonths } from "./infant-age.js";

const INFANT_COACH_PREVIEW_ONLY_ERROR = "infant_coach_preview_only";

describe("infant coach preview guard — age boundary", () => {
  it("treats 0–23 months as infant preview", () => {
    for (const age of [0, 6, 12, 18, 23]) {
      assert.equal(isInfantAgeMonths(age), true, `${age}m`);
    }
  });

  it("allows coach mutations at 24+ months", () => {
    for (const age of [24, 30, 48]) {
      assert.equal(isInfantAgeMonths(age), false, `${age}m`);
    }
  });

  it("uses a distinct coach preview error code", () => {
    assert.equal(INFANT_COACH_PREVIEW_ONLY_ERROR, "infant_coach_preview_only");
  });
});
