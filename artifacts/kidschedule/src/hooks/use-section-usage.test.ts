import { describe, expect, it } from "vitest";
import {
  MAX_FREE_BLOCKS,
  isSectionBlockLocked,
  normalizeSectionUsage,
} from "./use-section-usage";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";

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

  it("uses MAX_FREE_BLOCKS of 2 by default", () => {
    expect(MAX_FREE_BLOCKS).toBe(2);
  });

  it("allows Story Hub up to five lifetime videos", () => {
    const used = ["1", "2", "3", "4"];
    expect(isSectionBlockLocked(used, "5", HUB_CONTENT_QUOTAS.storyHubLifetimeVideos)).toBe(false);
    expect(isSectionBlockLocked(["1", "2", "3", "4", "5"], "6", HUB_CONTENT_QUOTAS.storyHubLifetimeVideos)).toBe(true);
  });

  it("allows Art & Craft up to ten lifetime videos", () => {
    const nine = Array.from({ length: 9 }, (_, i) => String(i));
    expect(isSectionBlockLocked(nine, "9", HUB_CONTENT_QUOTAS.artCraftLifetimeVideos)).toBe(false);
    expect(isSectionBlockLocked([...nine, "9"], "10", HUB_CONTENT_QUOTAS.artCraftLifetimeVideos)).toBe(true);
  });

  it("P0-7 D2 allows all four Emotional Support hard-day cards before lock", () => {
    const used = ["overwhelmed", "anxious", "connect"];
    expect(isSectionBlockLocked(used, "break", 4)).toBe(false);
    expect(isSectionBlockLocked([...used, "break"], "extra", 4)).toBe(true);
  });
});
