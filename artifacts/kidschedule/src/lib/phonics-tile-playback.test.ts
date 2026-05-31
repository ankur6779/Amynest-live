import { describe, expect, it } from "vitest";
import {
  phonicsTilePlaybackText,
  phonicsTileUsesPhonicsMode,
  phonicsTileCvcWordKey,
} from "@/lib/phonics-tile-playback";

describe("phonicsTilePlaybackText", () => {
  it("CVC word uses bare word not verbose API sound line", () => {
    const text = phonicsTilePlaybackText({
      type: "word",
      symbol: "sat",
      sound: "Listen with Amy in this audio lesson about the letter S and sat the cat.",
    });
    expect(text).toBe("sat");
  });

  it("word pack tiles use phonics mode", () => {
    expect(
      phonicsTileUsesPhonicsMode({
        type: "word",
        symbol: "cat",
        sound: "C says cat — Amy audio lesson",
      }),
    ).toBe(true);
    expect(phonicsTileCvcWordKey({ type: "word", symbol: "cat", sound: "long line" })).toBe(
      "cat",
    );
  });
});
