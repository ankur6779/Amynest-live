import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateTokensFromText,
  logInfantAiCost,
} from "../services/infantAiCostMonitor.js";

describe("infantAiCostMonitor", () => {
  it("estimateTokensFromText approximates from character count", () => {
    assert.equal(estimateTokensFromText(""), 1);
    assert.equal(estimateTokensFromText("abcd"), 1);
    assert.equal(estimateTokensFromText("a".repeat(40)), 10);
  });

  it("logInfantAiCost does not throw", () => {
    assert.doesNotThrow(() =>
      logInfantAiCost({
        job: "infant_feeding_plan",
        userId: "u_test",
        childId: 1,
        estimatedTokens: 120,
        cached: false,
      }),
    );
  });
});
