import { describe, expect, it } from "vitest";
import {
  isValidDisplayPhonicsItem,
  sanitizeDisplayPhonicsItems,
} from "@/lib/phonics-item-guards";
import type { DisplayPhonicsItem } from "@/hooks/use-phonics-data";

describe("phonics-item-guards", () => {
  it("accepts well-formed display items", () => {
    const item: DisplayPhonicsItem = {
      id: "cat",
      symbol: "cat",
      sound: "cat",
      type: "word",
    };
    expect(isValidDisplayPhonicsItem(item)).toBe(true);
  });

  it("rejects rows missing symbol", () => {
    expect(
      isValidDisplayPhonicsItem({
        id: "x",
        symbol: "",
        sound: "x",
        type: "word",
      } as DisplayPhonicsItem),
    ).toBe(false);
  });

  it("filters null and malformed entries", () => {
    const good: DisplayPhonicsItem = {
      id: "a",
      symbol: "A",
      sound: "A says ah",
      type: "letter",
    };
    const out = sanitizeDisplayPhonicsItems([
      good,
      null,
      undefined,
      { id: "bad", symbol: "", sound: "x", type: "word" } as DisplayPhonicsItem,
    ]);
    expect(out).toEqual([good]);
  });
});
