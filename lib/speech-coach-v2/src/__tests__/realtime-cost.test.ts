import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateRealtimeCostUsd,
  mergeRealtimeUsageDelta,
  parseRealtimeResponseUsage,
  percentile,
} from "../realtime-cost";

describe("realtime-cost", () => {
  it("parses response.done usage breakdown", () => {
    const delta = parseRealtimeResponseUsage({
      type: "response.done",
      response: {
        usage: {
          total_tokens: 150,
          input_tokens: 100,
          output_tokens: 50,
          input_token_details: {
            audio_tokens: 80,
            cached_tokens: 64,
            text_tokens: 20,
          },
          output_token_details: {
            audio_tokens: 40,
            text_tokens: 10,
          },
        },
      },
    });

    assert.ok(delta);
    assert.equal(delta!.inputTokens, 100);
    assert.equal(delta!.outputAudioTokens, 40);
    assert.equal(delta!.cachedInputTokens, 64);
  });

  it("merges usage deltas", () => {
    const a = parseRealtimeResponseUsage({
      response: { usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } },
    })!;
    const b = parseRealtimeResponseUsage({
      response: { usage: { input_tokens: 20, output_tokens: 8, total_tokens: 28 } },
    })!;
    const merged = mergeRealtimeUsageDelta(a, b);
    assert.equal(merged.inputTokens, 30);
    assert.equal(merged.outputTokens, 13);
  });

  it("estimates cost from audio breakdown", () => {
    const usage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputAudioTokens: 80,
      outputAudioTokens: 40,
      cachedInputTokens: 64,
      inputTextTokens: 20,
      outputTextTokens: 10,
    };
    const est = estimateRealtimeCostUsd(usage, 85);
    assert.ok(est.costUsd > 0);
    assert.ok(est.costInr > 0);
    assert.ok(est.costInr >= est.costUsd);
  });

  it("computes percentile", () => {
    assert.equal(percentile([1, 2, 3, 4, 100], 95), 100);
    assert.equal(percentile([], 95), 0);
  });
});
