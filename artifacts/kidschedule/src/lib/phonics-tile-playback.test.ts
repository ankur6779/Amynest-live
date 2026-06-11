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

  it("single-letter tiles use phonics mode (not Amy default lesson)", () => {
    expect(
      phonicsTileUsesPhonicsMode({
        type: "letter",
        symbol: "s",
        sound: "Listen with Amy in this audio lesson about the letter S.",
      }),
    ).toBe(true);
  });

  it("sentence tiles stay on default read-aloud mode", () => {
    expect(
      phonicsTileUsesPhonicsMode({
        type: "sentence",
        symbol: "The cat sat.",
        sound: "The cat sat on the mat.",
      }),
    ).toBe(false);
  });

  it("ignores verbose Parent Hub lesson lines on letter tiles", () => {
    const lesson =
      "Newborn sleep is not broken — it is biologically designed to be short, fragmented, and frequent.";
    expect(
      phonicsTilePlaybackText({
        type: "letter",
        symbol: "s",
        sound: lesson,
      }),
    ).toBe("s");
  });

  it("ignores verbose lesson lines on sound-discovery tiles", () => {
    const lesson = "Listen with Amy in this audio lesson about the letter S.";
    expect(
      phonicsTilePlaybackText({
        type: "sound",
        symbol: "Moo",
        sound: lesson,
      }),
    ).toBe("moo");
  });
});
