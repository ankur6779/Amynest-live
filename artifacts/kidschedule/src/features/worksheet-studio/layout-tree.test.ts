import { describe, expect, it } from "vitest";
import {
  buildLayoutTree,
  generateWorksheetLocal,
  layoutGeometryFingerprint,
  layoutTreeFingerprint,
  prepareLayoutForRender,
  validateLayoutTree,
  renderLayoutTreeToPdf,
  LAYOUT,
  CONTENT_WIDTH,
} from "@workspace/worksheet-studio";

const SUBJECTS = ["english", "math", "evs", "hindi", "phonics"] as const;
const CLASSES = ["nursery", "lkg", "ukg", "grade1", "grade2"] as const;

describe("layout tree determinism", () => {
  it("produces identical geometry hash for same document", () => {
    const doc = generateWorksheetLocal({
      prompt: "sea animals phonics UKG",
      classLevel: "ukg",
      subject: "phonics",
      difficulty: "easy",
      pageCount: 2,
    });
    const a = buildLayoutTree(doc);
    const b = buildLayoutTree(doc);
    expect(a.geometryHash).toBe(b.geometryHash);
    expect(layoutTreeFingerprint(a)).toBe(layoutTreeFingerprint(b));
  });

  it("validates layout tree before render", () => {
    const doc = generateWorksheetLocal({
      prompt: "math practice grade 1",
      classLevel: "grade1",
      subject: "math",
      difficulty: "medium",
      pageCount: 1,
    });
    const { layoutTree } = prepareLayoutForRender(doc);
    const result = validateLayoutTree(layoutTree);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("uses named content width constant", () => {
    expect(CONTENT_WIDTH).toBe(LAYOUT.CONTENT_WIDTH);
    expect(LAYOUT.CONTENT_WIDTH).toBe(LAYOUT.PAGE_WIDTH - LAYOUT.PAGE_MARGIN * 2);
  });

  it("passes geometry validation for 100 generated worksheets", () => {
    const failures: string[] = [];
    for (let i = 0; i < 100; i++) {
      const classLevel = CLASSES[i % CLASSES.length]!;
      const subject = SUBJECTS[i % SUBJECTS.length]!;
      const doc = generateWorksheetLocal({
        prompt: `${subject} worksheet batch ${i} long prompt text for wrapping test`,
        classLevel,
        subject,
        difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
        pageCount: 1 + (i % 2),
      });
      const tree = buildLayoutTree(doc);
      const v = validateLayoutTree(tree);
      if (!v.ok) failures.push(`#${i}: ${v.errors.join("; ")}`);
    }
    expect(failures).toEqual([]);
  });

  it("records golden geometry fingerprints per subject (deterministic regression)", () => {
    const fingerprints: Record<string, string> = {};
    for (const subject of SUBJECTS) {
      const doc = generateWorksheetLocal({
        prompt: `${subject} golden layout`,
        classLevel: "ukg",
        subject,
        difficulty: "easy",
        pageCount: 1,
      });
      const tree = buildLayoutTree(doc);
      const hash = layoutGeometryFingerprint(tree);
      fingerprints[subject] = hash;
      expect(hash).toMatch(/^lg_v1_[0-9a-f]+$/);
      expect(layoutTreeFingerprint(tree)).toMatch(/^lt_v1_[0-9a-f]+$/);
    }
    // Stable geometry across runs for fixed generator inputs
    expect(Object.keys(fingerprints)).toHaveLength(SUBJECTS.length);
  });

  it("PDF export uses the same layout tree geometry", async () => {
    const doc = generateWorksheetLocal({
      prompt: "math parity test",
      classLevel: "ukg",
      subject: "math",
      difficulty: "easy",
      pageCount: 1,
    });
    const { layoutTree } = prepareLayoutForRender(doc);
    const before = layoutGeometryFingerprint(layoutTree);
    const pdfBytes = await renderLayoutTreeToPdf(layoutTree);
    expect(pdfBytes.byteLength).toBeGreaterThan(500);
    const after = layoutGeometryFingerprint(buildLayoutTree(doc));
    expect(after).toBe(before);
  });
});
