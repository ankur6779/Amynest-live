import { describe, expect, it } from "vitest";
import {
  auditDocumentToLayoutTree,
  buildStageDumps,
  buildStaticIntegrityWorksheet,
  dumpWorksheetDocument,
  dumpLayoutTreeCounts,
  findMissingLayoutChildren,
  assertDocumentLayoutIntegrity,
  buildLayoutTree,
  generateWorksheetLocal,
} from "@workspace/worksheet-studio";

describe("Document → LayoutTree integrity", () => {
  it("STEP5 static worksheet: document and layout tree counts match", () => {
    const doc = buildStaticIntegrityWorksheet();
    const dump = dumpWorksheetDocument(doc);

    expect(dump.pages).toBe(1);
    expect(dump.questions).toBe(4);
    expect(dump.images).toBeGreaterThanOrEqual(1); // header logo + standalone image
    expect(dump.writingLines).toBe(2);
    expect(dump.illustrations).toBeGreaterThanOrEqual(3);

    const audit = auditDocumentToLayoutTree(doc);
    expect(audit.countDiffs.filter((d) => d.startsWith("questions:") || d.startsWith("pages:"))).toEqual([]);
    expect(audit.layoutDump.questionBlocks).toBe(4);
    expect(audit.layoutDump.prompts).toBe(4);
    expect(audit.layoutDump.answerLines).toBe(2);
    expect(audit.layoutDump.illustrations).toBe(3); // q1,q2,q4 have emoji

    const missing = findMissingLayoutChildren(doc, buildLayoutTree(doc));
    expect(missing).toEqual([]);

    // Static worksheet must pass hard integrity (no throw)
    expect(() => assertDocumentLayoutIntegrity(doc)).not.toThrow();
    expect(audit.ok || audit.issues.every((i) => i.code === "ILLUSTRATION_LABEL_DROPPED")).toBe(true);
  });

  it("STEP1+2 generated local worksheet: question counts must match", () => {
    const doc = generateWorksheetLocal({
      prompt: "sea animals phonics UKG",
      classLevel: "ukg",
      subject: "phonics",
      difficulty: "easy",
      pageCount: 2,
    });
    const audit = auditDocumentToLayoutTree(doc);
    expect(audit.documentDump.questions).toBe(audit.layoutDump.questionBlocks);
    expect(audit.documentDump.pages).toBe(audit.layoutDump.pages);
    expect(audit.documentDump.writingLines).toBe(audit.layoutDump.answerLines);

    const hard = audit.issues.filter((i) =>
      ["COUNT_MISMATCH", "QUESTION_MISSING_IN_TREE", "PROMPT_CHILD_MISSING", "NAN_GEOMETRY"].includes(i.code),
    );
    expect(hard).toEqual([]);
  });

  it("STEP3 every question block has prompt child in LayoutTree", () => {
    const doc = buildStaticIntegrityWorksheet();
    const tree = buildLayoutTree(doc);
    const counts = dumpLayoutTreeCounts(tree);
    for (const q of counts.questionDetails) {
      expect(q.hasPrompt).toBe(true);
      expect(q.childKinds[0]).toBe("prompt");
    }
  });

  it("STEP6 stage dumps expose first corruption stage when empty", () => {
    const doc = buildStaticIntegrityWorksheet();
    const stages = buildStageDumps(doc);
    expect(stages.stage1_document.questions).toBe(4);
    expect(stages.stage2_layoutTree.questionBlocks).toBe(4);
    expect(stages.audit.firstCorruptionStage).toBeNull();
  });

  it("STEP7 fails when a question prompt is empty in WorksheetDocument", () => {
    const doc = buildStaticIntegrityWorksheet();
    const q = doc.pages[0]!.elements.find((e) => e.type === "question_block");
    if (q && q.type === "question_block") q.prompt = "";
    const audit = auditDocumentToLayoutTree(doc);
    expect(audit.ok).toBe(false);
    expect(audit.firstCorruptionStage).toBe("WorksheetDocument");
    expect(audit.issues.some((i) => i.code === "EMPTY_PROMPT")).toBe(true);
  });
});
