import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync } from "node:fs";
import { assertBrandAssetsPresent } from "./assets-resolver.js";
import { selectBrandCharacters } from "./characters.js";
import { getBrandIdentityKit, pickBrandCtaLine } from "./identity.js";
import { evaluateBrandQualityGate } from "./quality-gate.js";

describe("AmyNest brand identity kit", () => {
  it("loads locked characters and official assets", () => {
    const kit = getBrandIdentityKit();
    assert.equal(kit.brandName, "AmyNest AI");
    assert.equal(kit.characters["amy-ai"].locked, true);
    assert.equal(kit.characters["amy-girl"].locked, true);
    assert.equal(kit.characters["amy-boy"].locked, true);
    assert.equal(kit.endCard.required, true);
    assert.ok(kit.endCard.ctaLines.length >= 3);
    assert.equal(kit.colors.primary, "#6A2CFF");
    const assets = assertBrandAssetsPresent();
    assert.equal(assets.ok, true, assets.missing.join(", "));
    assert.ok(existsSync(kit.appIconAsset));
  });

  it("casts characters by pillar without random swaps", () => {
    assert.equal(
      selectBrandCharacters({ category: "Speech", title: "Speech Practice" }).primary,
      "amy-girl",
    );
    assert.equal(
      selectBrandCharacters({ category: "Games", title: "Math adventure" }).primary,
      "amy-boy",
    );
    assert.equal(
      selectBrandCharacters({ category: "Parenting", title: "Amy Coach tips" }).primary,
      "amy-ai",
    );
  });

  it("picks CTA lines deterministically", () => {
    assert.equal(pickBrandCtaLine("topic-a"), pickBrandCtaLine("topic-a"));
  });

  it("quality gate fails without AmyNest mention", () => {
    const report = evaluateBrandQualityGate({
      content: {
        topic: {
          id: "t1",
          title: "Test",
          category: "Parenting",
          difficulty: "beginner",
          ageGroup: "all",
          keywords: [],
          cta: "Try now",
          priority: 1,
          estimatedDuration: 15,
          videoStyle: "short",
        },
        title: "Test",
        alternateTitles: [],
        hook: "Hook",
        openingQuestion: "Why?",
        story: "Story",
        keyPoints: ["a", "b", "c"],
        cta: "Try now",
        voiceScript: "short",
        sceneScript: "scene",
        captions: [],
        description: "desc",
        hashtags: [],
        keywords: [],
        seoScore: 10,
        readingTime: 1,
        estimatedDuration: 15,
        language: "en-IN",
        provider: "mock",
        generatedAt: new Date().toISOString(),
        version: "2.0.0",
      },
    });
    assert.equal(report.ok, false);
    assert.ok(report.findings.some((f) => f.code === "BRAND_NAME_MISSING"));
  });
});
