import { describe, expect, it } from "vitest";
import {
  dedupePrompts,
  shuffleInPlace,
  randomizeOptions,
  paginateQuestions,
  getIllustration,
  detectIllustrationFromText,
  batchGenerateIllustrations,
  parseCopilotCommand,
  generateAnswerKeyDocument,
  WORKSHEET_TEMPLATE_CATALOG,
  searchTemplates,
  layoutQuestionBlocks,
} from "@workspace/worksheet-studio";
import { buildLpsHeaderElements, page1ContentStartY } from "@workspace/worksheet-studio";
import { generateWorksheetLocal } from "@workspace/worksheet-studio";
import { WORKSHEET_TEMPLATES, getTemplateById } from "@workspace/worksheet-studio";
import { applyWorksheetImprovement } from "@workspace/worksheet-studio";

describe("pagination", () => {
  it("dedupes prompts", () => {
    const items = [{ prompt: "A" }, { prompt: "a" }, { prompt: "B" }];
    expect(dedupePrompts(items)).toHaveLength(2);
  });

  it("shuffles options", () => {
    const opts = randomizeOptions(["A", "B", "C", "D"]);
    expect(opts).toHaveLength(4);
  });

  it("paginates within page bounds", () => {
    const blocks = Array.from({ length: 8 }, (_, i) => ({
      block: {
        questionNumber: i + 1,
        questionType: "fill_blank" as const,
        prompt: `Q${i}`,
        width: 555,
        height: 80,
      },
      height: 80,
    }));
    const meta = {
      title: "T", topic: "T", classLevel: "ukg" as const, subject: "english" as const,
      difficulty: "easy" as const, pageCount: 2, colorMode: "color" as const,
      createdAt: "", updatedAt: "",
    };
    const pages = paginateQuestions(blocks, meta, page1ContentStartY("ukg"), 36, 2);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.length).toBeLessThanOrEqual(2);
  });
});

describe("LPS header", () => {
  it("builds header with section field", () => {
    const meta = {
      title: "Sea", topic: "Sea Animals", classLevel: "ukg" as const, subject: "evs" as const,
      difficulty: "easy" as const, pageCount: 1, colorMode: "color" as const,
      createdAt: "", updatedAt: "",
    };
    const els = buildLpsHeaderElements(meta);
    const texts = els.filter((e) => e.type === "text").map((e) => e.type === "text" ? e.content : "");
    expect(texts.some((t) => t.includes("Section"))).toBe(true);
    expect(texts.some((t) => t.includes("LUCKNOW PUBLIC SCHOOL"))).toBe(true);
  });
});

describe("local generator", () => {
  it("generates a worksheet document", () => {
    const doc = generateWorksheetLocal({
      prompt: "UKG sea animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    expect(doc.pages.length).toBeGreaterThan(0);
    expect(doc.pages[0]?.showLpsHeader).toBe(true);
    expect(doc.pages[0]?.elements.length).toBeGreaterThan(0);
  });

  it("only puts header on page 1", () => {
    const doc = generateWorksheetLocal({
      prompt: "math practice",
      classLevel: "grade1",
      subject: "math",
      difficulty: "medium",
      pageCount: 2,
    });
    if (doc.pages.length > 1) {
      const p2header = doc.pages[1]?.elements.some(
        (e) => e.type === "text" && e.content.includes("LUCKNOW PUBLIC SCHOOL"),
      );
      expect(p2header).toBe(false);
    }
  });
});

describe("templates", () => {
  it("has nursery through grade 2", () => {
    expect(WORKSHEET_TEMPLATES.find((t) => t.id === "nursery")).toBeDefined();
    expect(getTemplateById("g2-math")).toBeDefined();
  });
});

describe("improvements", () => {
  it("applies increase spacing", () => {
    const doc = generateWorksheetLocal({
      prompt: "test", classLevel: "ukg", subject: "english", difficulty: "easy", pageCount: 1,
    });
    const next = applyWorksheetImprovement(doc, "increase_spacing");
    expect(next.version).toBe(doc.version + 1);
  });
});

const baseDoc = () => generateWorksheetLocal({
  prompt: "UKG sea animals",
  classLevel: "ukg",
  subject: "evs",
  difficulty: "easy",
  pageCount: 1,
});

describe("illustration-engine", () => {
  it("generates cached SVG data URLs", () => {
    const a = getIllustration("fish");
    const b = getIllustration("fish");
    expect(a).toBe(b);
    expect(a.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("detects from text", () => {
    expect(detectIllustrationFromText("Colour the dolphin")).toBe("dolphin");
  });

  it("batch generates", () => {
    const m = batchGenerateIllustrations(["fish", "apple"]);
    expect(m.size).toBe(2);
  });
});

describe("copilot", () => {
  it("parses easier command", () => {
    const doc = baseDoc();
    const r = parseCopilotCommand("Make this easier", doc);
    expect(r.kind).toBe("action");
    if (r.kind === "action") expect(r.action).toBe("easier");
  });

  it("parses replace command", () => {
    const doc = baseDoc();
    const r = parseCopilotCommand("replace whale with dolphin", doc);
    expect(r.kind).toBe("regenerate");
  });
});

describe("answer-key-engine", () => {
  it("generates answer key document", () => {
    const doc = baseDoc();
    const key = generateAnswerKeyDocument(doc);
    expect(key.meta.isAnswerKey).toBe(true);
    expect(key.pages[0]?.elements.some((e) => e.type === "question_block" && e.prompt.includes("→"))).toBe(true);
  });
});

describe("template-catalog", () => {
  it("has 100+ templates", () => {
    expect(WORKSHEET_TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(100);
  });

  it("searches templates", () => {
    const hits = searchTemplates("tracing");
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe("layout-engine", () => {
  it("layouts with illustration keep-together", () => {
    const meta = {
      title: "T", topic: "T", classLevel: "ukg" as const, subject: "english" as const,
      difficulty: "easy" as const, pageCount: 2, colorMode: "color" as const,
      createdAt: "", updatedAt: "",
    };
    const blocks = Array.from({ length: 6 }, (_, i) => ({
      block: {
        questionNumber: i + 1,
        questionType: "colour" as const,
        prompt: `Q${i}`,
        width: 555,
        height: 90,
        illustrationSrc: getIllustration("fish"),
      },
      height: 90,
      hasIllustration: true,
      keepTogether: true,
    }));
    const pages = layoutQuestionBlocks(blocks, meta, 200, 36, 2);
    expect(pages.length).toBeGreaterThan(0);
  });
});

describe("local generator illustrations", () => {
  it("attaches illustrationSrc to questions", () => {
    const doc = generateWorksheetLocal({
      prompt: "sea animals fish dolphin",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    const q = doc.pages.flatMap((p) => p.elements).find((e) => e.type === "question_block");
    expect(q && q.type === "question_block" && q.illustrationSrc).toBeTruthy();
  });
});
