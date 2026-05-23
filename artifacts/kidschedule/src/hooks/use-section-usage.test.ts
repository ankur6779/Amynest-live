import { describe, expect, it } from "vitest";
import {
  MAX_FREE_BLOCKS,
  isSectionBlockLocked,
  normalizeSectionUsage,
} from "./use-section-usage";

describe("normalizeSectionUsage", () => {
  it("migrates legacy blockUsedId to blockUsedIds array", () => {
    const result = normalizeSectionUsage({
      blockUsedId: "completed",
      subBlockUsedId: null,
      usedAt: 1000,
    });
    expect(result?.blockUsedIds).toEqual(["completed"]);
  });

  it("preserves new multi-block shape", () => {
    const result = normalizeSectionUsage({
      blockUsedIds: ["goal-a", "goal-b"],
      subBlockUsedId: null,
      usedAt: 2000,
    });
    expect(result?.blockUsedIds).toEqual(["goal-a", "goal-b"]);
  });

  it("returns null for empty legacy records", () => {
    expect(normalizeSectionUsage({})).toBeNull();
    expect(normalizeSectionUsage(null)).toBeNull();
  });
});

describe("isSectionBlockLocked", () => {
  it("allows up to MAX_FREE_BLOCKS before locking others", () => {
    expect(isSectionBlockLocked([], "article-1")).toBe(false);
    expect(isSectionBlockLocked(["article-1"], "article-2")).toBe(false);
    expect(isSectionBlockLocked(["article-1", "article-2"], "article-3")).toBe(true);
  });

  it("never locks already-used blocks (resume/revisit)", () => {
    const used = ["manage-tantrums", "balance-screen-time"];
    expect(isSectionBlockLocked(used, "manage-tantrums")).toBe(false);
    expect(isSectionBlockLocked(used, "new-goal")).toBe(true);
  });

  it("uses MAX_FREE_BLOCKS of 2", () => {
    expect(MAX_FREE_BLOCKS).toBe(2);
  });
});
