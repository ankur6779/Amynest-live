import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderPromptTemplate } from "../index.js";
import {
  PROMPT_LIBRARY,
  getPromptTemplatesByFamily,
  resolvePromptFamily,
} from "./templates.js";

describe("prompt library", () => {
  it("includes required prompt families", () => {
    const families = new Set(PROMPT_LIBRARY.map((p) => p.family));
    for (const family of [
      "parenting",
      "astro",
      "health",
      "speech",
      "games",
      "routines",
      "learning",
      "motivation",
      "premium-cta",
      "support",
      "hindi",
      "english",
      "hinglish",
    ]) {
      assert.ok(families.has(family as never), `missing ${family}`);
    }
  });

  it("renders variables in templates", () => {
    const template = getPromptTemplatesByFamily("parenting")[0]!;
    const rendered = renderPromptTemplate(template.userPromptTemplate, {
      title: "Calm Mornings",
      category: "Routines",
      ageGroup: "3-5y",
      language: "en-IN",
      duration: "30",
      videoStyle: "short",
      cta: "Try AmyNest",
      keywords: "routine, calm",
    });
    assert.match(rendered, /Calm Mornings/);
    assert.match(rendered, /Routines/);
    assert.equal(rendered.includes("{{title}}"), false);
  });

  it("resolves category and language families", () => {
    assert.equal(resolvePromptFamily("Amy Astro", "en-IN").categoryFamily, "astro");
    assert.equal(resolvePromptFamily("Speech", "hi-IN").languageFamily, "hindi");
    assert.equal(
      resolvePromptFamily("Parenting", "hinglish").languageFamily,
      "hinglish",
    );
  });
});
