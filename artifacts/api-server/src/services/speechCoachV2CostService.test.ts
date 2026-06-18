import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateRealtimeCostUsd, percentile } from "@workspace/speech-coach-v2";

describe("speechCoachV2CostService helpers", () => {
  it("estimates non-zero INR for typical short response", () => {
    const est = estimateRealtimeCostUsd(
      {
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        inputAudioTokens: 100,
        outputAudioTokens: 60,
        cachedInputTokens: 64,
        inputTextTokens: 20,
        outputTextTokens: 20,
      },
      85,
    );
    assert.ok(est.costInr > 0);
    assert.ok(est.costUsd > 0);
  });

  it("returns zero percentile for empty set", () => {
    assert.equal(percentile([], 95), 0);
  });
});
