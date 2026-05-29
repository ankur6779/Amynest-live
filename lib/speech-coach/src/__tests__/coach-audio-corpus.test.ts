import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCoachDialogueAudioTexts,
  getCoachDialogueExtraAudioTexts,
  getCoachDialogueWarmupPhrases,
  substituteCoachNameForStatic,
} from "../coach-audio-corpus.js";
import { getCoachDialogueAudioTextsForStaticCatalog } from "../coach-dialogue.js";

describe("coach-audio-corpus", () => {
  it("substitutes child name placeholder for static catalog", () => {
    assert.equal(substituteCoachNameForStatic("Hello {childName}!"), "Hello friend!");
    assert.equal(substituteCoachNameForStatic("Welcome back, {childName}."), "Welcome back, friend.");
  });

  it("deduplicates template lines case-insensitively", () => {
    const lines = buildCoachDialogueAudioTexts(["Try again", "try again", "  Try again  "]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0], "Try again");
  });

  it("exports warmup phrases aligned with static UI catalog", () => {
    const warmup = getCoachDialogueWarmupPhrases();
    assert.ok(warmup.length >= 10);
    assert.ok(warmup.some((p) => /good job/i.test(p)));
    assert.ok(warmup.some((p) => /listen carefully/i.test(p)));
  });

  it("includes achievement and correction extras", () => {
    const extras = getCoachDialogueExtraAudioTexts();
    assert.ok(extras.some((l) => l.includes("first word spoken clearly")));
    assert.ok(extras.some((l) => l.startsWith("Let's try that again")));
  });

  it("collects a broad static catalog from coach dialogue templates", () => {
    const corpus = getCoachDialogueAudioTextsForStaticCatalog();
    assert.ok(corpus.length >= 80);
    assert.ok(corpus.some((l) => l.includes("Let's begin")));
    assert.ok(corpus.some((l) => l.includes("Your turn")));
  });
});
