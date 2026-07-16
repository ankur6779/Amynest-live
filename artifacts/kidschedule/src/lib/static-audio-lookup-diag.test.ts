import { describe, expect, it } from "vitest";
import { buildStaticAudioLookupMissReport } from "./static-audio-lookup-diag";

describe("static-audio-lookup-diag", () => {
  const catalog = {
    "ask open questions: 'who was there? what happened before? how did you feel?' avoid 'just ignore it' — that teaches helplessness.":
      "/api/static-audio/4df9e01b8d07bd9228cc592cf4d09aa8.mp3",
  };

  it("finds exact catalog key with levenshtein 0 when text matches", () => {
    const text =
      "Ask open questions: 'Who was there? What happened before? How did you feel?' Avoid 'just ignore it' — that teaches helplessness.";
    const report = buildStaticAudioLookupMissReport(text, catalog, { mapReady: true });
    expect(report.closestCatalogKeys[0]?.levenshtein).toBe(0);
    expect(report.closestCatalogKeys[0]?.catalogHashFromUrl).toBe(
      "4df9e01b8d07bd9228cc592cf4d09aa8",
    );
  });

  it("reports map not ready and closest key when catalog empty", () => {
    const report = buildStaticAudioLookupMissReport("hello world", {}, { mapReady: false });
    expect(report.mapReady).toBe(false);
    expect(report.closestCatalogKeys).toHaveLength(0);
  });
});
