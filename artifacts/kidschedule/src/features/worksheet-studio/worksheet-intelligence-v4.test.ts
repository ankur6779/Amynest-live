import { describe, expect, it } from "vitest";
import {
  generateWorksheetLocal,
  validateEducationalQuality,
  scoreWorksheet,
  diversifyQuestionTemplates,
  diversifyActivityOrder,
  repairPrintIssues,
  validatePrintReadiness,
  applyPrintMode,
  parseCopilotCommand,
  generateWorksheetVariant,
  duplicateWorksheetDocument,
  getLpsStandard,
  LPS_CLASS_STANDARDS,
  PRINT_MODE_LABELS,
  finalizeWorksheet,
} from "@workspace/worksheet-studio";

const baseReq = {
  prompt: "UKG sea animals fish dolphin",
  classLevel: "ukg" as const,
  subject: "evs" as const,
  difficulty: "easy" as const,
  pageCount: 1,
};

describe("LPS standards", () => {
  it("defines standards for nursery through grade 2", () => {
    expect(Object.keys(LPS_CLASS_STANDARDS)).toHaveLength(5);
    expect(getLpsStandard("nursery").illustrationDensity).toBe("high");
    expect(getLpsStandard("grade2").maxWordsInPrompt).toBeGreaterThan(10);
  });
});

describe("question diversity", () => {
  it("balances activity types", () => {
    const pool = [
      { type: "colour" as const, prompt: "Colour the fish." },
      { type: "circle" as const, prompt: "Circle the dog." },
      { type: "match" as const, prompt: "Match pairs." },
      { type: "trace" as const, prompt: "Trace A." },
      { type: "count" as const, prompt: "Count stars." },
    ];
    const out = diversifyQuestionTemplates(pool, 4, "ukg", "easy");
    expect(out.length).toBe(4);
    expect(new Set(out.map((q) => q.type)).size).toBeGreaterThan(2);
  });

  it("avoids adjacent duplicate types", () => {
    const ordered = diversifyActivityOrder([
      { type: "colour", prompt: "A" },
      { type: "colour", prompt: "B" },
      { type: "circle", prompt: "C" },
    ]);
    expect(ordered[0]?.type).not.toBe(ordered[1]?.type);
  });
});

describe("educational validation", () => {
  it("validates generated worksheets", () => {
    const doc = generateWorksheetLocal(baseReq);
    const issues = validateEducationalQuality(doc);
    expect(issues.filter((i) => i.code === "NO_QUESTIONS")).toHaveLength(0);
    expect(issues.filter((i) => i.code === "DUPLICATE_QUESTIONS")).toHaveLength(0);
  });
});

describe("quality scoring", () => {
  it("scores worksheets above threshold", () => {
    const doc = generateWorksheetLocal(baseReq);
    const score = scoreWorksheet(doc);
    expect(score.overall).toBeGreaterThanOrEqual(70);
    expect(score.diversity).toBeGreaterThan(0);
  });

  it("finalizes with repair pipeline", () => {
    const doc = generateWorksheetLocal(baseReq);
    const result = finalizeWorksheet(doc);
    expect(result.document.pages.length).toBeGreaterThan(0);
    expect(result.quality.overall).toBeGreaterThan(0);
  });
});

describe("print validation", () => {
  it("repairs margin issues", () => {
    const doc = generateWorksheetLocal(baseReq);
    const broken = structuredClone(doc);
    const q = broken.pages[0]?.elements.find((e) => e.type === "question_block");
    if (q) q.x = 0;
    const repaired = repairPrintIssues(broken);
    const issues = validatePrintReadiness(repaired);
    expect(issues.filter((i) => i.code === "MARGIN_LEFT")).toHaveLength(0);
  });

  it("applies print modes", () => {
    const doc = generateWorksheetLocal(baseReq);
    const bw = applyPrintMode(doc, "bw");
    expect(bw.meta.colorMode).toBe("bw");
    const large = applyPrintMode(doc, "large_font");
    expect(large.meta.colorMode).toBe("color");
  });

  it("has all print mode labels", () => {
    expect(Object.keys(PRINT_MODE_LABELS).length).toBe(6);
  });
});

describe("teacher assistant", () => {
  it("parses homework command", () => {
    const doc = generateWorksheetLocal(baseReq);
    const r = parseCopilotCommand("Make suitable for homework", doc);
    expect(r.kind).toBe("action");
    if (r.kind === "action") expect(r.action).toBe("homework_mode");
  });

  it("parses writing practice", () => {
    const doc = generateWorksheetLocal(baseReq);
    const r = parseCopilotCommand("Add more writing practice", doc);
    expect(r.kind).toBe("action");
    if (r.kind === "action") expect(r.action).toBe("more_writing");
  });
});

describe("teacher productivity", () => {
  it("duplicates worksheet", () => {
    const doc = generateWorksheetLocal(baseReq);
    const copy = duplicateWorksheetDocument(doc);
    expect(copy.id).not.toBe(doc.id);
    expect(copy.meta.title).toContain("Copy");
  });

  it("generates homework variant", () => {
    const doc = generateWorksheetLocal(baseReq);
    const hw = generateWorksheetVariant(doc, "homework");
    expect(hw.prompt).toContain("homework");
  });

  it("generates assessment variant", () => {
    const doc = generateWorksheetLocal(baseReq);
    const asmt = generateWorksheetVariant(doc, "assessment");
    expect(asmt.meta.difficulty).toBe("hard");
  });
});
