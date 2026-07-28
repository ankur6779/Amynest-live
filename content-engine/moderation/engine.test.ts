import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GeneratedScriptPayload } from "../types/content-package.js";
import { moderatePayload, moderateText } from "./engine.js";

function basePayload(overrides: Partial<GeneratedScriptPayload> = {}): GeneratedScriptPayload {
  return {
    hook: "A calm tip",
    openingQuestion: "Shall we try?",
    story: "A gentle story for parents",
    keyPoints: ["one", "two", "three"],
    cta: "Try AmyNest",
    voiceScript: "Speak kindly today.",
    sceneScript: "SCENE 1",
    titles: {
      primary: "Title",
      alternates: ["1", "2", "3", "4", "5"],
      short: "Short",
      highCtr: "CTR",
      searchOptimized: "Search",
    },
    description: {
      seo: "seo",
      appPromotion: "app",
      playStoreCta: "play",
      website: "web",
      socialLinks: "social",
      disclaimer: "disclaimer",
    },
    hashtags: Array.from({ length: 10 }, (_, i) => `T${i}`),
    keywords: ["a", "b", "c"],
    ...overrides,
  };
}

describe("moderation", () => {
  it("rejects medical misinformation and unsafe advice", () => {
    const medical = moderateText("This miracle cure will heal autism overnight");
    assert.ok(medical.some((v) => v.code === "medical_misinformation"));

    const unsafe = moderateText("You should hit your child for discipline");
    assert.ok(unsafe.some((v) => v.code === "unsafe_parenting"));
  });

  it("accepts clean parenting payloads", () => {
    const result = moderatePayload(basePayload());
    assert.equal(result.ok, true);
  });

  it("flags harmful absolute claims in payload fields", () => {
    const result = moderatePayload(
      basePayload({ story: "This method has guaranteed results every time." }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((v) => v.code === "harmful_claims"));
  });
});
