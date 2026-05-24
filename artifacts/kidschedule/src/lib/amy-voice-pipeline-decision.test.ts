import { describe, expect, it } from "vitest";
import {
  buildPipelineDecisionLog,
  logPipelineDecision,
  logTotalAudioFailure,
} from "@/lib/amy-voice-pipeline-decision";

describe("amy-voice-pipeline-decision", () => {
  it("buildPipelineDecisionLog matches never-silent debug shape", () => {
    const decision = buildPipelineDecisionLog(
      "math:8+8",
      [
        { layer: "static", error: "static_failed" },
        { layer: "cache", error: "cache_miss" },
      ],
      {
        module: "smart_math",
        dynamicAttempted: false,
        streamingAttempted: false,
        emergencyAttempted: true,
        synthesisAttempted: false,
      },
    );

    expect(decision.cacheKey).toBe("math:8+8");
    expect(decision.staticTried).toBe(true);
    expect(decision.staticResult).toBe("rejected_invalid_blob");
    expect(decision.cacheTried).toBe(true);
    expect(decision.cacheResult).toBe("cache_miss");
    expect(decision.finalLayer).toBe("text_visual");
  });

  it("logPipelineDecision and logTotalAudioFailure do not throw", () => {
    expect(() =>
      logPipelineDecision({
        cacheKey: "key",
        staticTried: true,
        staticResult: "rejected_invalid_blob",
        cacheTried: true,
        cacheResult: "miss",
        apiTried: false,
        apiSkipped: "api_disabled",
        streamingTried: false,
        streamingSkipped: "safe_mode",
        finalLayer: "text_visual",
      }),
    ).not.toThrow();

    expect(() =>
      logTotalAudioFailure({
        cacheKey: "key",
        module: "phonics",
        reason: "all_layers_failed",
      }),
    ).not.toThrow();
  });
});
