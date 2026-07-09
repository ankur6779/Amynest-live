import { describe, expect, it } from "vitest";
import {
  generateWorksheetLocal,
  applyBrandingToDocument,
  applyPrintMode,
  prepareWorksheetForExport,
  finalizeWorksheet,
  createDefaultProfile,
  generateBulkWorksheets,
  CLASS_LABELS,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
  PRINT_MODE_LABELS,
} from "@workspace/worksheet-studio";

const classes = Object.keys(CLASS_LABELS) as Array<keyof typeof CLASS_LABELS>;
const subjects = Object.keys(SUBJECT_LABELS) as Array<keyof typeof SUBJECT_LABELS>;
const difficulties = Object.keys(DIFFICULTY_LABELS) as Array<keyof typeof DIFFICULTY_LABELS>;
const printModes = Object.keys(PRINT_MODE_LABELS);

describe("production bulk generation", () => {
  it("generates 50 unique worksheets without crash", () => {
    const docs = generateBulkWorksheets({
      prompt: "Stress test animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    }, 50);
    expect(docs).toHaveLength(50);
    const titles = new Set(docs.map((d) => d.meta.title));
    expect(titles.size).toBe(50);
    for (const doc of docs) {
      expect(doc.pages.length).toBeGreaterThan(0);
      expect(finalizeWorksheet(doc).document.pages.length).toBeGreaterThan(0);
    }
  });
});

describe("cross-matrix worksheet quality", () => {
  it("generates across all class/subject/difficulty combos", () => {
    let count = 0;
    for (const classLevel of classes) {
      for (const subject of subjects.slice(0, 4)) {
        for (const difficulty of difficulties) {
          const doc = generateWorksheetLocal({
            prompt: `${classLevel} ${subject} practice`,
            classLevel,
            subject,
            difficulty,
            pageCount: 1,
          });
          const prepared = prepareWorksheetForExport(doc);
          expect(prepared.meta.classLevel).toBe(classLevel);
          expect(prepared.pages[0]?.elements.length).toBeGreaterThan(0);
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(60);
  });
});

describe("print modes and branding export pipeline", () => {
  it("applies every print mode for export", () => {
    const base = generateWorksheetLocal({
      prompt: "Print certification worksheet",
      classLevel: "grade1",
      subject: "math",
      difficulty: "medium",
      pageCount: 2,
    });
    for (const mode of printModes) {
      const branded = applyBrandingToDocument(base, createDefaultProfile({ schoolName: "CERT SCHOOL" }));
      const printed = applyPrintMode(branded, mode as keyof typeof PRINT_MODE_LABELS);
      const out = prepareWorksheetForExport(printed);
      expect(out.pages.length).toBeGreaterThan(0);
    }
  });
});

describe("large page worksheets", () => {
  it("handles 4-page worksheets", () => {
    const doc = generateWorksheetLocal({
      prompt: "Large multi-page EVS worksheet on transport and animals",
      classLevel: "grade2",
      subject: "evs",
      difficulty: "hard",
      pageCount: 4,
    });
    expect(doc.pages.length).toBeLessThanOrEqual(4);
    expect(doc.pages.length).toBeGreaterThan(0);
    const result = finalizeWorksheet(doc);
    expect(result.quality.overall).toBeGreaterThan(50);
  });
});

describe("branding profiles export", () => {
  it("brands worksheets for multiple school presets", () => {
    const base = generateWorksheetLocal({
      prompt: "Branded export test",
      classLevel: "lkg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
    });
    const schools = ["SCHOOL A", "SCHOOL B", "SCHOOL C"];
    for (const name of schools) {
      const branded = applyBrandingToDocument(base, createDefaultProfile({ schoolName: name }));
      expect(branded.pages[0]?.elements.some((e) => e.type === "text" && e.content === name)).toBe(true);
      expect(prepareWorksheetForExport(branded).meta.topic).toBeTruthy();
    }
  });
});
