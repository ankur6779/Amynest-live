import { describe, expect, it, beforeEach } from "vitest";
import {
  enhancePromptLocal,
  buildGenerationSummary,
  insertSuggestionIntoPrompt,
  validateReferenceBatch,
  countReferenceImages,
  savePromptHistory,
  listPromptHistory,
  searchPromptHistory,
  PROMPT_SUGGESTIONS,
  REFERENCE_MAX_FILES,
} from "@workspace/worksheet-studio";

describe("prompt enhancer v6.1", () => {
  it("builds rich local enhanced prompt", () => {
    const out = enhancePromptLocal({
      prompt: "Create sea animals worksheet",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 2,
      language: "english",
    });
    expect(out).toContain("UKG");
    expect(out.toLowerCase()).toContain("sea animals");
    expect(out).toContain("LUCKNOW PUBLIC SCHOOL");
    expect(out).toContain("A4");
  });

  it("includes reference context when provided", () => {
    const out = enhancePromptLocal({
      prompt: "Like this worksheet",
      classLevel: "lkg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
      references: [{
        id: "r1",
        filename: "old-sheet.pdf",
        kind: "pdf",
        mimeType: "application/pdf",
        sizeBytes: 1000,
        pageCount: 2,
        layoutHints: ["bordered"],
      }],
    });
    expect(out).toContain("old-sheet.pdf");
    expect(out).toContain("original");
  });
});

describe("prompt suggestions", () => {
  it("inserts suggestion into empty prompt", () => {
    const s = PROMPT_SUGGESTIONS[0]!;
    expect(insertSuggestionIntoPrompt("", s.insert)).toBe(s.insert);
  });

  it("appends suggestion to existing prompt", () => {
    const next = insertSuggestionIntoPrompt("Sea animals", "Include tracing.");
    expect(next).toContain("Sea animals");
    expect(next).toContain("tracing");
  });
});

describe("reference limits", () => {
  it("rejects more than max files", () => {
    const existing = Array.from({ length: REFERENCE_MAX_FILES }, (_, i) => ({
      id: `e${i}`,
      filename: `f${i}.png`,
      kind: "image" as const,
      mimeType: "image/png",
      sizeBytes: 100,
    }));
    const result = validateReferenceBatch(existing, [{ filename: "x.png", mimeType: "image/png", sizeBytes: 100 }]);
    expect(result.ok).toBe(false);
  });

  it("counts images in references", () => {
    const n = countReferenceImages([
      { id: "1", filename: "a.png", kind: "image", mimeType: "image/png", sizeBytes: 1, imageCount: 1 },
      { id: "2", filename: "b.pdf", kind: "pdf", mimeType: "application/pdf", sizeBytes: 1, imageCount: 4 },
    ]);
    expect(n).toBe(5);
  });
});

describe("generation summary", () => {
  it("rates excellent when enhanced prompt present", () => {
    const s = buildGenerationSummary({
      classLevel: "ukg",
      subject: "english",
      difficulty: "easy",
      pageCount: 2,
      prompt: "short",
      enhancedPrompt: "A very detailed professionally designed worksheet with many requirements and LPS standards.",
      references: [],
      language: "english",
    });
    expect(s.promptQuality).toBe("Excellent");
    expect(s.qualityEstimate).toBeGreaterThan(90);
  });
});

describe("prompt history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and searches prompts", () => {
    savePromptHistory({
      prompt: "Sea animals UKG",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
      referenceCount: 0,
    });
    expect(listPromptHistory().length).toBe(1);
    expect(searchPromptHistory("sea").length).toBe(1);
    expect(searchPromptHistory("math").length).toBe(0);
  });
});
