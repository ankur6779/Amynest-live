import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentEngineError } from "../ai/errors.js";
import { parseGeneratedScriptPayload } from "./schema.js";

const validPayload = {
  hook: "Hook",
  openingQuestion: "Ready?",
  story: "Story",
  keyPoints: ["a", "b", "c"],
  cta: "Try AmyNest",
  voiceScript: "Speak this calmly.",
  sceneScript: "SCENE 1",
  titles: {
    primary: "Primary Title",
    alternates: ["A1", "A2", "A3", "A4", "A5"],
    short: "Short",
    highCtr: "High CTR",
    searchOptimized: "Search Title",
  },
  description: {
    seo: "SEO",
    appPromotion: "App",
    playStoreCta: "Play",
    website: "Web",
    socialLinks: "Social",
    disclaimer: "Disclaimer",
  },
  hashtags: Array.from({ length: 12 }, (_, i) => `Tag${i}`),
  keywords: ["parenting", "amynest", "kids"],
};

describe("script JSON schema", () => {
  it("parses valid structured JSON", () => {
    const parsed = parseGeneratedScriptPayload(JSON.stringify(validPayload));
    assert.equal(parsed.titles.alternates.length, 5);
    assert.equal(parsed.keyPoints.length, 3);
  });

  it("accepts fenced JSON", () => {
    const parsed = parseGeneratedScriptPayload(
      `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``,
    );
    assert.equal(parsed.hook, "Hook");
  });

  it("rejects invalid JSON and incomplete schema", () => {
    assert.throws(
      () => parseGeneratedScriptPayload("{nope"),
      (err: unknown) => err instanceof ContentEngineError && err.code === "INVALID_JSON",
    );
    assert.throws(
      () =>
        parseGeneratedScriptPayload(
          JSON.stringify({ ...validPayload, keyPoints: ["only-one"] }),
        ),
      (err: unknown) =>
        err instanceof ContentEngineError && err.code === "SCHEMA_VALIDATION",
    );
  });
});
