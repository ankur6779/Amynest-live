import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GeneratedScriptPayload } from "../types/content-package.js";
import { calculateQualityScore } from "./quality.js";

function payload(): GeneratedScriptPayload {
  return {
    hook: "What if mornings felt calmer?",
    openingQuestion: "Ready to try one gentle change?",
    story: "Families grow when routines feel warm and safe together.",
    keyPoints: ["Start soft", "Keep it short", "Celebrate progress", "Use AmyNest"],
    cta: "Try AmyNest AI free",
    voiceScript:
      "What if mornings felt calmer? Try one gentle cue. Keep it short. Celebrate progress. Try AmyNest AI free.",
    sceneScript: "SCENE 1\nSCENE 2\nSCENE 3\nSCENE 4",
    titles: {
      primary: "Calm Morning Routines for Kids | AmyNest AI",
      alternates: ["A", "B", "C", "D", "E"],
      short: "Calm Mornings",
      highCtr: "Try This Gentle Morning Tip Today",
      searchOptimized: "Morning Routine Tips for Parents | AmyNest",
    },
    description: {
      seo: "seo",
      appPromotion: "AmyNest AI helps families",
      playStoreCta: "play",
      website: "web",
      socialLinks: "social",
      disclaimer: "disclaimer",
    },
    hashtags: ["AmyNest", "Parenting"],
    keywords: ["morning routine", "amynest"],
  };
}

describe("quality scoring", () => {
  it("scores clarity emotion curiosity retention CTR and brand", () => {
    const score = calculateQualityScore({
      payload: payload(),
      topicTitle: "Calm Morning Routines",
      category: "Routines",
      channelName: "AmyNest AI",
    });
    assert.ok(score.overall >= 60);
    assert.ok(score.brandConsistency >= 70);
    assert.ok(score.curiosity >= 50);
  });
});
