import { describe, expect, it } from "vitest";
import {
  checkPhonicsLetterClip,
  checkPhonicsWordClip,
} from "@/lib/phonics-audio-availability";

describe("phonics-audio-availability", () => {
  it("treats static-catalog CVC words as available even without library manifest", () => {
    const shop = checkPhonicsWordClip("shop");
    expect(shop.available).toBe(true);
    expect(shop.catalogKey).toBe("static:shop");
  });

  it("treats static-catalog digraph keys as available", () => {
    const sh = checkPhonicsLetterClip("sh");
    expect(sh.available).toBe(true);
  });

  it("marks words missing from both library and static catalog unavailable", () => {
    const chat = checkPhonicsWordClip("chat");
    expect(chat.available).toBe(false);
  });
});
