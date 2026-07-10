import { describe, expect, it } from "vitest";
import {
  generateWorksheetLocal,
  buildPageFrameElements,
  applyBrandingToDocument,
  createDefaultProfile,
} from "@workspace/worksheet-studio";

const seaReq = {
  prompt: "Create a UKG worksheet on Sea Animals",
  classLevel: "ukg" as const,
  subject: "evs" as const,
  difficulty: "easy" as const,
  pageCount: 2,
};

describe("professional page output v6.1", () => {
  it("adds page border on every page", () => {
    const doc = generateWorksheetLocal(seaReq);
    for (const page of doc.pages) {
      expect(page.elements.some((e) => e.id === `page_border_${page.pageNumber}`)).toBe(true);
      expect(page.elements.some((e) => e.id === `page_border_inner_${page.pageNumber}`)).toBe(true);
    }
  });

  it("shows LPS header with logo on page 1 only", () => {
    const doc = applyBrandingToDocument(generateWorksheetLocal(seaReq));
    const p1 = doc.pages[0]!;
    expect(p1.elements.some((e) => e.id === "brand_logo")).toBe(true);
    expect(p1.elements.some((e) => e.type === "text" && e.content.includes("Topic – Sea Animals"))).toBe(true);
    const p2 = doc.pages[1]!;
    expect(p2.elements.some((e) => e.id.startsWith("page_continuation_"))).toBe(true);
    expect(p2.elements.some((e) => e.id === "brand_logo")).toBe(false);
  });

  it("uses sea animals professional question set", () => {
    const doc = generateWorksheetLocal(seaReq);
    const prompts = doc.pages.flatMap((p) =>
      p.elements.filter((e) => e.type === "question_block").map((e) => e.prompt),
    );
    expect(prompts.length).toBeGreaterThanOrEqual(4);
    expect(prompts.some((p) => p.includes("Read the sentences and colour"))).toBe(true);
    expect(prompts.some((p) => p.includes("Circle the water animals"))).toBe(true);
    expect(prompts.some((p) => p.includes("beginning sound"))).toBe(true);
    expect(prompts.some((p) => p.includes("Match the animal"))).toBe(true);
  });

  it("buildPageFrameElements returns white fill border", () => {
    const profile = createDefaultProfile();
    const frames = buildPageFrameElements(1, {
      title: "T",
      topic: "Sea Animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
      colorMode: "color",
      createdAt: "",
      updatedAt: "",
    }, profile);
    const outer = frames.find((e) => e.id === "page_border_1");
    expect(outer?.type).toBe("shape");
    if (outer?.type === "shape") expect(outer.fill).toBe("#ffffff");
  });
});
