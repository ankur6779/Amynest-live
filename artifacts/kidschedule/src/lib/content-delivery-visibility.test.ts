import { describe, expect, it } from "vitest";
import {
  CONTENT_DELIVERY_MODULE_IDS,
  buildContentAgeMatrix,
  contentModuleVisibility,
} from "./content-delivery-visibility";
import { CURIOSITY_CATALOG } from "./content-catalog-inventory";

describe("content delivery visibility matrix", () => {
  it("shows Infant Care for every infant band and hides it at 24 months", () => {
    for (const months of [1, 3, 6, 9, 12, 18, 23]) {
      expect(contentModuleVisibility("infant-hub", months)).toBe("VISIBLE");
    }
    expect(contentModuleVisibility("infant-hub", 24)).toBe("HIDDEN");
    expect(contentModuleVisibility("infant-hub", 36)).toBe("HIDDEN");
  });

  it("keeps Coloring discoverable for infants as preview and full from 24m", () => {
    expect(contentModuleVisibility("coloring-books", 6)).toBe("PREVIEW");
    expect(contentModuleVisibility("coloring-books", 18)).toBe("PREVIEW");
    expect(contentModuleVisibility("coloring-books", 30)).toBe("VISIBLE");
    expect(contentModuleVisibility("fun-sheets", 8)).toBe("PREVIEW");
  });

  it("keeps worksheets, curiosity, and videos visible across ages", () => {
    expect(contentModuleVisibility("worksheets", 6)).toBe("VISIBLE");
    expect(contentModuleVisibility("answer-to-kids-how", 6)).toBe("VISIBLE");
    expect(contentModuleVisibility("art-craft", 6)).toBe("VISIBLE");
    expect(contentModuleVisibility("story-hub", 6)).toBe("VISIBLE");
  });

  it("builds a complete age × module matrix", () => {
    const matrix = buildContentAgeMatrix();
    expect(Object.keys(matrix)).toContain("newborn");
    expect(Object.keys(matrix)).toContain("m18");
    expect(Object.keys(matrix)).toContain("preschool");
    expect(matrix.newborn["infant-hub"]).toBe("VISIBLE");
    expect(matrix.newborn["coloring-books"]).toBe("PREVIEW");
    expect(matrix.toddler["infant-hub"]).toBe("HIDDEN");
    expect(matrix.toddler["coloring-books"]).toBe("VISIBLE");
    for (const id of CONTENT_DELIVERY_MODULE_IDS) {
      expect(matrix.preschool[id]).toBeDefined();
    }
  });

  it("inventories curiosity books with signed-preview API paths", () => {
    expect(CURIOSITY_CATALOG.length).toBeGreaterThanOrEqual(12);
    for (const row of CURIOSITY_CATALOG) {
      expect(row.objectPath.startsWith("Answer to How/")).toBe(true);
      expect(row.browserUrlPath).toContain("/api/kids-how-library/preview-url");
      expect(row.source).toBe("gcs");
    }
  });
});
