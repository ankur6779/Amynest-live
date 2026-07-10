import { describe, expect, it } from "vitest";
import {
  analyzeReconstructionSource,
  analyzeReconstructionSources,
  mergeReconstructionAnalyses,
  parseReconstructionResponse,
  reconstructWorksheetLocal,
  validateReconstructionDocument,
  RECONSTRUCTION_STYLE_LABELS,
  generateWorksheetLocal,
} from "@workspace/worksheet-studio";
import type { WorksheetReconstructRequest } from "@workspace/worksheet-studio";

function handwrittenRef() {
  return {
    id: "ref_hw",
    filename: "notebook_sea_animals_UKG.jpg",
    kind: "image" as const,
    mimeType: "image/jpeg",
    sizeBytes: 120_000,
    imageCount: 1,
    textSnippet: "Topic – Sea Animals\nClass UKG\n1. Colour the fish.\n2. Circle the whale.\n3. Match the animals.\nhandwriting practice",
    layoutHints: ["notebook page", "bordered"],
    thumbnailDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
  };
}

function scannedPdfRef() {
  return {
    id: "ref_pdf",
    filename: "printed_worksheet_math.pdf",
    kind: "pdf" as const,
    mimeType: "application/pdf",
    sizeBytes: 800_000,
    pageCount: 2,
    imageCount: 3,
    textSnippet: "Grade 1 Math\nQ1. 2 + 3 = ___\nQ2. Count the apples.\ntable grid",
    layoutHints: ["scanned document", "tables/grids"],
  };
}

function lowLightPhotoRef() {
  return {
    id: "ref_low",
    filename: "whatsapp_whiteboard.png",
    kind: "image" as const,
    mimeType: "image/png",
    sizeBytes: 90_000,
    textSnippet: "rough sketch fish apple tree draw the shapes",
    layoutHints: ["tilted page", "low light"],
  };
}

function bilingualRef() {
  return {
    id: "ref_bi",
    filename: "hindi_english_mixed.pdf",
    kind: "pdf" as const,
    mimeType: "application/pdf",
    sizeBytes: 400_000,
    pageCount: 1,
    textSnippet: "Hindi swar अ क ख\nEnglish: Circle the cat\nबिल्ली",
    layoutHints: ["bilingual"],
  };
}

function baseReq(overrides: Partial<WorksheetReconstructRequest> = {}): WorksheetReconstructRequest {
  return {
    sources: [handwrittenRef()],
    style: "lps",
    classLevel: "ukg",
    subject: "evs",
    difficulty: "easy",
    ...overrides,
  };
}

describe("reconstruction engine v7.0", () => {
  it("exposes all reconstruction style labels", () => {
    expect(RECONSTRUCTION_STYLE_LABELS.exact).toBe("Recreate Exactly");
    expect(RECONSTRUCTION_STYLE_LABELS.lps).toBe("LPS Style");
    expect(Object.keys(RECONSTRUCTION_STYLE_LABELS).length).toBe(8);
  });

  it("analyzes handwritten notebook page", () => {
    const a = analyzeReconstructionSource(handwrittenRef());
    expect(a.classLevel).toBe("ukg");
    expect(a.subject).toBe("evs");
    expect(a.questions.length).toBeGreaterThanOrEqual(2);
    expect(a.activities).toContain("colouring");
    expect(a.hasHandwriting).toBe(true);
    expect(a.drawings.some((d) => d.label === "fish")).toBe(true);
    expect(a.confidence).toBeGreaterThan(50);
  });

  it("analyzes scanned PDF with tables", () => {
    const a = analyzeReconstructionSource(scannedPdfRef());
    expect(a.classLevel).toBe("grade1");
    expect(a.subject).toBe("math");
    expect(a.tables).toBeGreaterThan(0);
    expect(a.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("detects drawings in low-light camera photo", () => {
    const a = analyzeReconstructionSource(lowLightPhotoRef());
    expect(a.drawings.length).toBeGreaterThan(0);
    expect(a.drawings.some((d) => d.replacedWithSvg)).toBe(true);
    expect(a.detectedImages.length).toBeGreaterThan(0);
  });

  it("handles mixed Hindi + English content", () => {
    const a = analyzeReconstructionSource(bilingualRef());
    expect(a.questions.length).toBeGreaterThanOrEqual(1);
    expect(a.activities.length).toBeGreaterThan(0);
  });

  it("merges multi-page analyses", () => {
    const merged = mergeReconstructionAnalyses(analyzeReconstructionSources([handwrittenRef(), scannedPdfRef()]));
    expect(merged.pageCount).toBeGreaterThanOrEqual(2);
    expect(merged.questions.length).toBeGreaterThan(2);
    expect(merged.confidence).toBeGreaterThan(40);
  });

  it("reconstructs local editable worksheet from handwritten page", () => {
    const result = reconstructWorksheetLocal(baseReq());
    expect(result.document.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.source).toBe("local");
    expect(result.usedFallback).toBe(true);
    const questions = result.document.pages.flatMap((p) => p.elements).filter((e) => e.type === "question_block");
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(result.document.meta.topic.toLowerCase()).toContain("sea");
  });

  it("applies low ink style in local reconstruction", () => {
    const result = reconstructWorksheetLocal(baseReq({ style: "low_ink" }));
    expect(result.document.meta.colorMode).toBe("bw");
  });

  it("falls back to template generator when no questions detected", () => {
    const result = reconstructWorksheetLocal(baseReq({
      sources: [{
        id: "x",
        filename: "blank.jpg",
        kind: "image",
        mimeType: "image/jpeg",
        sizeBytes: 1000,
      }],
      analysis: {
        activities: [],
        detectedImages: [],
        questions: [],
        drawings: [],
        tables: 0,
        hasHandwriting: false,
        hasStudentAnswers: false,
        pageCount: 1,
        confidence: 40,
        uncertainAreas: [],
        source: "local",
      },
    }));
    expect(result.document.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.uncertainAreas.some((u) => u.includes("unavailable"))).toBe(true);
  });

  it("parses AI reconstruction JSON into editable document", () => {
    const req = baseReq();
    const fallback = generateWorksheetLocal({
      prompt: "fallback",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    const aiJson = {
      title: "Sea Animals",
      topic: "Sea Animals",
      pages: [{
        elements: [
          { kind: "text", content: "Instructions: Colour carefully.", x: 28, y: 120, fontSize: 12 },
          { kind: "question", number: 1, type: "colour", prompt: "Colour the fish.", illustrationLabel: "fish" },
          { kind: "writing_lines", x: 28, y: 500, width: 400, count: 3 },
        ],
      }],
      uncertainAreas: ["Handwriting on line 2"],
    };
    const { document, uncertainAreas } = parseReconstructionResponse(aiJson, req, fallback);
    expect(document.meta.topic).toBe("Sea Animals");
    const els = document.pages[0]!.elements;
    expect(els.some((e) => e.type === "text")).toBe(true);
    expect(els.some((e) => e.type === "question_block")).toBe(true);
    expect(els.some((e) => e.type === "shape" && e.shapeKind === "line")).toBe(true);
    expect(uncertainAreas).toContain("Handwriting on line 2");
  });

  it("replaces rough fish drawing with SVG illustration", () => {
    const req = baseReq();
    const fallback = generateWorksheetLocal({
      prompt: "f",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    const { document } = parseReconstructionResponse({
      title: "Fish",
      topic: "Fish",
      pages: [{
        elements: [
          { kind: "question", number: 1, type: "draw", prompt: "Draw the fish.", illustrationLabel: "fish" },
        ],
      }],
    }, req, fallback);
    const q = document.pages.flatMap((p) => p.elements).find((e) => e.type === "question_block");
    expect(q?.type === "question_block" && q.illustrationSrc?.includes("svg")).toBe(true);
  });

  it("validates reconstructed document quality", () => {
    const result = reconstructWorksheetLocal(baseReq());
    const validation = validateReconstructionDocument(result.document, analyzeReconstructionSource(handwrittenRef()));
    expect(validation.highlights.length).toBeGreaterThan(0);
    expect(validation.confidence).toBeGreaterThan(0);
  });

  it("flags missing questions in validation", () => {
    const empty = generateWorksheetLocal({
      prompt: "empty",
      classLevel: "ukg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
    });
    const stripped = {
      ...empty,
      pages: empty.pages.map((p) => ({ ...p, elements: p.elements.filter((e) => e.type !== "question_block") })),
    };
    const validation = validateReconstructionDocument(stripped);
    expect(validation.issues.some((i) => i.includes("No questions"))).toBe(true);
  });

  it("handles OCR failure with offline fallback message", () => {
    const result = reconstructWorksheetLocal(baseReq({
      sources: [{ id: "bad", filename: "corrupt.bin", kind: "image", mimeType: "image/jpeg", sizeBytes: 50 }],
    }));
    expect(result.document).toBeDefined();
    expect(result.source).toBe("local");
  });

  it("table reconstruction via shape elements in AI parse", () => {
    const req = baseReq();
    const fallback = generateWorksheetLocal({
      prompt: "t",
      classLevel: "grade1",
      subject: "math",
      difficulty: "easy",
      pageCount: 1,
    });
    const { document } = parseReconstructionResponse({
      title: "Table",
      topic: "Table",
      pages: [{
        elements: [
          { kind: "shape", shapeKind: "rect", x: 28, y: 200, width: 200, height: 80 },
          { kind: "question", number: 1, type: "math", prompt: "Fill the table.", options: ["2", "3"] },
        ],
      }],
    }, req, fallback);
    expect(document.pages[0]!.elements.some((e) => e.type === "shape")).toBe(true);
  });
});
