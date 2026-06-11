import { describe, expect, it } from "vitest";
import {
  hasPhonicsStaticCatalogAudio,
  hasStaticCatalogAudio,
  isPhonicsOnlyCatalogText,
  resolvePhonicsCatalogPhrase,
} from "@/lib/unified-catalog-playback";

const NEWBORN_LESSON =
  "newborn sleep is not broken — it is biologically designed to be short, fragmented, and frequent. in the first 12 weeks, your baby has no circadian rhythm yet. their melatonin production matures around week 8 to 12, which is why bedtimes start to settle only after that point.";

describe("unified-catalog-playback phonics guards", () => {
  it("treats single letters as phonics-only catalog text", () => {
    expect(isPhonicsOnlyCatalogText("b")).toBe(true);
    expect(isPhonicsOnlyCatalogText("sh")).toBe(true);
    expect(isPhonicsOnlyCatalogText("a as in apple")).toBe(true);
    expect(isPhonicsOnlyCatalogText(NEWBORN_LESSON)).toBe(false);
  });

  it("does not treat Parent Hub lesson paragraphs as phonics static audio", () => {
    expect(hasPhonicsStaticCatalogAudio(NEWBORN_LESSON)).toBe(false);
    expect(
      hasStaticCatalogAudio(NEWBORN_LESSON, { phonicsOnly: true }),
    ).toBe(false);
  });

  it("resolves letter b to phonics bucket without default-catalog fallback", () => {
    expect(
      resolvePhonicsCatalogPhrase("b", { phonicsOnly: true }),
    ).toBe("b");
    expect(hasPhonicsStaticCatalogAudio("b")).toBe(true);
  });

  it("phonicsOnly resolve never returns a default-only lesson phrase for corrupt input", () => {
    const resolved = resolvePhonicsCatalogPhrase(NEWBORN_LESSON, {
      phonicsOnly: true,
    });
    expect(resolved.toLowerCase()).toContain("newborn sleep");
    expect(hasPhonicsStaticCatalogAudio(resolved)).toBe(false);
  });
});
