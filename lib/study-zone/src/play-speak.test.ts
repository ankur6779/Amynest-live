import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPlayItemCatalogSpeakOpts,
  getPlayItemSpeakParts,
  getPlayItemSpeakText,
  getTopicAmySpeakText,
  getTopicNotesSpeakText,
} from "./play-speak.js";
import type { PlayItem, StudyTopic } from "./types.js";

describe("play-speak", () => {
  it("reads full rhyme body, not short speak blurb", () => {
    const item: PlayItem = {
      id: "twinkle",
      label: "Twinkle",
      speak: "Twinkle star",
      body: "Twinkle twinkle little star.\nHow I wonder what you are.",
    };
    assert.equal(
      getPlayItemSpeakText(item, "rhymes"),
      "Twinkle twinkle little star. How I wonder what you are.",
    );
    const opts = getPlayItemCatalogSpeakOpts(item, "rhymes");
    assert.equal(opts.catalogPlayback, true);
    assert.ok(opts.staticCatalogTexts[0]?.includes("little star"));
  });

  it("splits compound numbers into static speak parts", () => {
    assert.deepEqual(getPlayItemSpeakParts({ id: "11", label: "11", speak: "Eleven" }, "numbers"), [
      "Eleven",
    ]);
    assert.deepEqual(getPlayItemSpeakParts({ id: "21", label: "21", speak: "Twenty One" }, "numbers"), [
      "Twenty",
      "One",
    ]);
  });

  it("prefers amySpeak over notes and AI prompt", () => {
    const topic = {
      amySpeak: "Addition means putting numbers together. Two plus three is five!",
      notes: "Addition means putting numbers together.\nExample: 2 + 3 = 5.",
      amyPrompt: "Explain addition simply for a class 1-5 child.",
    } satisfies Pick<StudyTopic, "amySpeak" | "notes" | "amyPrompt">;
    assert.equal(
      getTopicAmySpeakText(topic),
      "Addition means putting numbers together. Two plus three is five!",
    );
    assert.ok(getTopicNotesSpeakText(topic).includes("Example"));
  });
});
