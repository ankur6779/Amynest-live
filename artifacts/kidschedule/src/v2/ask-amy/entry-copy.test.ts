import { describe, expect, it } from "vitest";
import {
  buildAskAmyEntryCta,
  buildAskAmyPageHeadline,
  buildAskAmySectionTitle,
  buildAskAmySheetBody,
  buildAskAmySheetTitle,
  buildAskAmyStartCta,
  buildAskAmySupport,
} from "./entry-copy";

describe("Ask Amy entry copy (presentation)", () => {
  it("Living Room CTA stays frozen (contextual ask — not Hearing dialect)", () => {
    expect(buildAskAmyEntryCta("sleep")).toBe("Ask about bedtime");
    expect(buildAskAmyEntryCta("speech_talking")).toBe(
      "Ask about today's speech practice",
    );
    expect(buildAskAmyEntryCta("behavior")).toBe("Ask about today's behaviour");
    expect(buildAskAmyEntryCta("learning_school")).toBe(
      "Ask about today's learning",
    );
  });

  it("never uses banned generic phrases", () => {
    const worries = [
      "sleep",
      "speech_talking",
      "behavior",
      "learning_school",
      "mornings",
      "feeding",
      "something_else",
      null,
    ] as const;
    for (const worry of worries) {
      const cta = buildAskAmyEntryCta(worry);
      expect(cta.toLowerCase()).not.toBe("ask amy");
      expect(cta.toLowerCase()).not.toBe("open ask amy");
      expect(cta.toLowerCase()).not.toBe("continue with amy");
      expect(buildAskAmySectionTitle(worry).toLowerCase()).not.toBe("ask amy");
      expect(buildAskAmyPageHeadline({ name: null, worry }).toLowerCase()).not.toMatch(
        /quick help|chatgpt/,
      );
      expect(buildAskAmyStartCta(worry).toLowerCase()).toMatch(/^speak /);
    }
  });

  it("Hearing support invites imperfect speech; sheet is care-only", () => {
    const support = buildAskAmySupport({ name: "Aarav", worry: "sleep" });
    expect(support).toMatch(/Aarav/);
    expect(support).toMatch(/Sleep/);
    expect(support.toLowerCase()).toMatch(/messy, brief, or long/);
    expect(support.toLowerCase()).toMatch(/carries the understanding/);
    expect(support.toLowerCase()).not.toMatch(
      /quick help|amy coach|prompt|perfect question/,
    );

    expect(buildAskAmyPageHeadline({ name: "Aarav", worry: "sleep" })).toMatch(
      /bedtime right now/i,
    );
    expect(buildAskAmyStartCta("sleep")).toBe("Speak about bedtime");

    expect(buildAskAmySheetTitle({ name: "Riya", worry: "behavior" })).toBe(
      "Keep Riya's place with Amy",
    );
    expect(buildAskAmySheetTitle({ name: null, worry: "sleep" })).toBe(
      "Keep today's place with Amy",
    );
    expect(buildAskAmySheetTitle({ name: "Riya", worry: "behavior" })).not.toBe(
      buildAskAmyEntryCta("behavior"),
    );

    const sheet = buildAskAmySheetBody({ name: "Riya", worry: "behavior" });
    expect(sheet).toMatch(/Riya/);
    expect(sheet.toLowerCase()).toMatch(/save your place/);
    expect(sheet.toLowerCase()).not.toMatch(/amy coach|quick help/);
  });
});
