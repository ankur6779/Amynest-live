import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadCheckedIds,
  saveCheckedIds,
  shoppingProgress,
  toggleCheckedId,
} from "@/features/nutrition/lib/shopping-storage";

describe("shopping-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists checked ids", () => {
    saveCheckedIds(new Set(["vegetables:tomato"]), "test-house");
    expect(loadCheckedIds("test-house").has("vegetables:tomato")).toBe(true);
  });

  it("toggleCheckedId adds and removes", () => {
    toggleCheckedId("grains:rice", "h1");
    expect(loadCheckedIds("h1").has("grains:rice")).toBe(true);
    toggleCheckedId("grains:rice", "h1");
    expect(loadCheckedIds("h1").has("grains:rice")).toBe(false);
  });

  it("shoppingProgress counts done items", () => {
    const items = [
      { id: "a", name: "A", category: "fruits" as const, quantity: 1, display: "A × 1" },
      { id: "b", name: "B", category: "fruits" as const, quantity: 1, display: "B × 1" },
    ];
    const progress = shoppingProgress(items, new Set(["a"]));
    expect(progress).toEqual({ done: 1, total: 2 });
  });
});
