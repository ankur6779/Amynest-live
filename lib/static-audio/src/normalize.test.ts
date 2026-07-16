import { describe, expect, it } from "vitest";
import {
  canonicalizeStaticAudioText,
  normalizeStaticAudioKey,
  normalizeSpeakTextForLookup,
} from "./normalize.js";

describe("static audio normalizer", () => {
  const bullyingPara1 =
    "Ask open questions: 'Who was there? What happened before? How did you feel?' Avoid 'just ignore it' — that teaches helplessness.";

  it("lowercases bullying paragraph to catalog key", () => {
    const key = normalizeStaticAudioKey(bullyingPara1);
    expect(key).toBe(
      "ask open questions: 'who was there? what happened before? how did you feel?' avoid 'just ignore it' — that teaches helplessness.",
    );
  });

  it("canonicalizes smart quotes and dash variants", () => {
    const smart =
      "Ask open questions: \u2018Who was there?\u2019 Avoid \u2018just ignore it\u2019 \u2013 that teaches helplessness.";
    expect(normalizeStaticAudioKey(smart)).toBe(
      normalizeStaticAudioKey(
        "Ask open questions: 'Who was there?' Avoid 'just ignore it' — that teaches helplessness.",
      ),
    );
  });

  it("strips zero-width characters", () => {
    const withZw = `hello\u200Bworld`;
    expect(canonicalizeStaticAudioText(withZw)).toBe("helloworld");
  });

  it("collapses whitespace in speak lookup", () => {
    const multiline = "Line one.\n\nLine two.";
    expect(normalizeSpeakTextForLookup(multiline)).toBe("line one. line two.");
  });
});
