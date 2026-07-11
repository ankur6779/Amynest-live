import { describe, expect, it } from "vitest";
import {
  generateWorksheetLocal,
  prepareWorksheetForExport,
  ensurePrintableIllustrations,
  scoreVisualQuality,
  optimizeForPrinting,
  tryConversationalEdit,
  stripEmojiText,
} from "@workspace/worksheet-studio";

describe("worksheet studio v10 professional polish", () => {
  it("strips emoji from text", () => {
    expect(stripEmojiText("Circle 🐶 and 🐝")).toBe("Circle and");
  });

  it("never leaves emoji illustrations on local phonics worksheets", () => {
    const doc = generateWorksheetLocal({
      prompt: "Phonics beginning sounds worksheet",
      classLevel: "nursery",
      subject: "phonics",
      difficulty: "easy",
      pageCount: 1,
    });
    const polished = ensurePrintableIllustrations(doc);
    for (const page of polished.pages) {
      for (const el of page.elements) {
        if (el.type !== "question_block") continue;
        expect(el.illustrationEmoji).toBeUndefined();
        if (el.prompt.includes("starts with") || el.illustrationLabel) {
          expect(el.illustrationSrc).toBeTruthy();
          expect(el.illustrationSrc).toMatch(/^data:image\/svg/);
        }
        expect(el.prompt).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
        for (const opt of el.options ?? []) {
          expect(opt).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
        }
      }
    }
  });

  it("removes AmyNest watermark on export prep", () => {
    const doc = generateWorksheetLocal({
      prompt: "UKG practice",
      classLevel: "ukg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
    });
    const prepared = prepareWorksheetForExport(doc);
    const footers = prepared.pages.flatMap((p) =>
      p.elements.filter((e) => e.type === "text" && e.id.startsWith("footer_")),
    );
    for (const f of footers) {
      if (f.type === "text") {
        expect(f.content).not.toMatch(/AmyNest Worksheet Studio/i);
      }
    }
  });

  it("conversational replace and print optimize edit in place", () => {
    const doc = generateWorksheetLocal({
      prompt: "Worksheet about cat",
      classLevel: "lkg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
    });
    const replaced = tryConversationalEdit("Replace cat with elephant", doc);
    expect(replaced?.summary).toMatch(/Replaced/i);
    const opt = tryConversationalEdit("Optimize for printing", doc);
    expect(opt?.summary).toMatch(/Optimized for printing/i);
  });

  it("optimize for printing raises printable quality path", () => {
    const doc = generateWorksheetLocal({
      prompt: "Math counting",
      classLevel: "ukg",
      subject: "math",
      difficulty: "easy",
      pageCount: 1,
    });
    const { document, quality } = optimizeForPrinting(doc);
    expect(quality).toBeGreaterThan(0);
    const score = scoreVisualQuality(document);
    expect(score.illustration).toBeGreaterThanOrEqual(80);
    expect(score.pass || score.overall >= 70).toBe(true);
  });
});
