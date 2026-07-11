import { describe, expect, it } from "vitest";
import {
  generateWorksheetLocal,
  repairPrintIssues,
  validateLayoutGeometry,
  measureQuestionBlockHeight,
  CONTENT_WIDTH,
  PAGE_MARGIN,
} from "@workspace/worksheet-studio";

const SUBJECTS = ["english", "math", "evs", "hindi", "phonics"] as const;
const CLASSES = ["nursery", "lkg", "ukg", "grade1", "grade2"] as const;

describe("flow layout engine", () => {
  it("measures multi-line reading prompts taller than single line", () => {
    const single = measureQuestionBlockHeight(
      { prompt: "Circle the fish." },
      "ukg",
      CONTENT_WIDTH,
    );
    const multi = measureQuestionBlockHeight(
      {
        prompt: "Read the sentences and colour the correct sea animal.\na. I see a fish.\nb. I see a shark.\nc. I see a whale.\nd. I see a crab.",
        options: ["Fish", "Shark", "Whale", "Crab"],
      },
      "ukg",
      CONTENT_WIDTH,
    );
    expect(multi).toBeGreaterThan(single + 40);
  });

  it("repairPrintIssues does not place questions inside header zone", () => {
    const doc = generateWorksheetLocal({
      prompt: "sea animals worksheet for UKG",
      classLevel: "ukg",
      subject: "english",
      difficulty: "easy",
      pageCount: 2,
    });
    const repaired = repairPrintIssues(doc);
    const page1Qs = repaired.pages[0]!.elements.filter((e) => e.type === "question_block");
    expect(page1Qs.length).toBeGreaterThan(0);
    for (const q of page1Qs) {
      expect(q.y).toBeGreaterThan(180);
      expect(q.x).toBe(PAGE_MARGIN);
      expect(q.width).toBeLessThanOrEqual(CONTENT_WIDTH + 2);
    }
    expect(validateLayoutGeometry(repaired)).toEqual([]);
  });

  it("generated worksheets pass layout geometry across subjects and classes", () => {
    const issues: string[] = [];
    for (const classLevel of CLASSES) {
      for (const subject of SUBJECTS) {
        const doc = generateWorksheetLocal({
          prompt: `${subject} practice worksheet`,
          classLevel,
          subject,
          difficulty: "easy",
          pageCount: 1,
        });
        issues.push(...validateLayoutGeometry(doc));
      }
    }
    expect(issues).toEqual([]);
  });

  it("consecutive question blocks do not overlap on the same page", () => {
    const doc = generateWorksheetLocal({
      prompt: "phonics sea animals",
      classLevel: "ukg",
      subject: "phonics",
      difficulty: "medium",
      pageCount: 2,
    });
    for (const page of doc.pages) {
      const qs = page.elements
        .filter((e) => e.type === "question_block")
        .sort((a, b) => a.y - b.y);
      for (let i = 1; i < qs.length; i++) {
        const prev = qs[i - 1]!;
        const curr = qs[i]!;
        expect(curr.y).toBeGreaterThanOrEqual(prev.y + prev.height + 10);
      }
    }
  });
});
