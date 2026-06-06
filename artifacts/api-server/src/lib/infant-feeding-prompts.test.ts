import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeInfantFeedingPlan,
  ALLERGY_INTRO_GUIDANCE_BLOCK,
} from "./infant-feeding-prompts.js";

describe("infant-feeding-prompts", () => {
  it("includes AAP allergy guidance block", () => {
    assert.match(ALLERGY_INTRO_GUIDANCE_BLOCK, /AAP-aligned/);
    assert.match(ALLERGY_INTRO_GUIDANCE_BLOCK, /allergyIntroductionRoadmap/);
  });

  it("sanitizeInfantFeedingPlan preserves allergyIntroductionRoadmap", () => {
    const plan = sanitizeInfantFeedingPlan({
      roadmapSummary: "Week one focus on iron-rich foods.",
      allergyIntroTimeline: ["Week 1: peanut"],
      allergyIntroductionRoadmap: [
        { week: 1, food: "Peanut", method: "Thin smooth paste mixed with puree" },
      ],
      portionGuidance: "Small spoonfuls",
      days: [
        {
          day: "Day 1",
          meals: {
            breakfast: { name: "Oat", texture: "thin", portion: "2 tbsp" },
          },
        },
      ],
    });
    assert.ok(plan);
    assert.equal(plan!.allergyIntroductionRoadmap.length, 1);
    assert.equal(plan!.allergyIntroductionRoadmap[0]!.food, "Peanut");
  });

  it("sanitizeInfantFeedingPlan derives timeline from roadmap when missing", () => {
    const plan = sanitizeInfantFeedingPlan({
      roadmapSummary: "Summary",
      allergyIntroTimeline: [],
      allergyIntroductionRoadmap: [{ week: 2, food: "Egg", method: "Mashed yolk" }],
      portionGuidance: "Small bites",
      days: [
        {
          day: "Day 1",
          meals: {
            lunch: { name: "Avocado", texture: "mashed", portion: "2 tsp" },
          },
        },
      ],
    });
    assert.ok(plan);
    assert.ok(plan!.allergyIntroTimeline.some((s) => s.includes("Egg")));
  });
});
