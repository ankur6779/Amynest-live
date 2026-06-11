import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectWorksheetLevel } from "./level-selector.ts";

describe("level-selector", () => {
  it("maps mastery bands to levels", () => {
    assert.equal(selectWorksheetLevel(30, "standard"), 1);
    assert.equal(selectWorksheetLevel(55, "standard"), 2);
    assert.equal(selectWorksheetLevel(75, "standard"), 3);
    assert.equal(selectWorksheetLevel(92, "standard"), 4);
  });
});
