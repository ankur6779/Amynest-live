import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateSeoScore } from "./score.js";

describe("SEO scoring", () => {
  it("returns a 0–100 overall score with component metrics", () => {
    const score = calculateSeoScore({
      title: "Gentle Discipline Tips for Parents | AmyNest AI",
      description:
        "Practical parenting guidance for families worldwide. Download AmyNest AI on Google Play: https://play.google.com/store/apps/details?id=com.amynest.app Website: https://www.amynest.in Disclaimer: Not medical advice.",
      keywords: ["gentle discipline", "parenting", "amynest", "kids routine"],
      hashtags: [
        "AmyNest",
        "Parenting",
        "ParentingTips",
        "Kids",
        "MomLife",
        "DadLife",
        "GentleParenting",
        "GlobalParenting",
        "Shorts",
        "ChildDevelopment",
        "AmyAstro",
        "FamilyRoutine",
      ],
      voiceScript:
        "Parents, gentle discipline starts with one calm cue. Try this tonight. Celebrate small progress. Try AmyNest AI.",
    });

    assert.ok(score.overall >= 0 && score.overall <= 100);
    assert.ok(score.titleQuality > 50);
    assert.ok(score.descriptionQuality > 50);
    assert.ok(score.hashtagDiversity > 50);
  });
});
