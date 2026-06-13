import { describe, expect, it } from "vitest";
import {
  auditSpeechCoachStaticCache,
  buildFeedbackStaticCatalogTexts,
  buildSpeechCoachSessionWarmupTexts,
} from "@/lib/speech-coach-audio-warmup";

describe("speech-coach-audio-warmup", () => {
  it("buildSpeechCoachSessionWarmupTexts merges opening with feedback corpus", () => {
    const texts = buildSpeechCoachSessionWarmupTexts(["Hello Aarav!", "Say cat."]);
    expect(texts.some((t) => t.includes("Hello"))).toBe(true);
    expect(texts.some((t) => t === "Good job!")).toBe(true);
    expect(texts.some((t) => t === "That was excellent.")).toBe(true);
  });

  it("buildFeedbackStaticCatalogTexts includes friend alias for personalized praise", () => {
    const catalog = buildFeedbackStaticCatalogTexts(["Great job, Aarav!"], {
      id: "w_cat",
      kind: "word",
      text: "cat",
    });
    expect(catalog).toContain("Great job, Aarav!");
    expect(catalog).toContain("Great job, friend!");
    expect(catalog).toContain("cat");
  });

  it("auditSpeechCoachStaticCache reports hits for corpus-backed opening lines", () => {
    const audit = auditSpeechCoachStaticCache("opening", [
      "Hello friend!",
      "Today we are learning words.",
      "totally unknown xyz phrase",
    ]);
    expect(audit.hits).toBeGreaterThanOrEqual(2);
    expect(audit.misses).toBeGreaterThanOrEqual(1);
    expect(audit.missSamples).toContain("totally unknown xyz phrase");
  });
});
