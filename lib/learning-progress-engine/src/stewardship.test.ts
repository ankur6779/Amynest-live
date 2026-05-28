import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reviewStewardship,
  passesStewardship,
  formatStewardshipDigest,
  STEWARDSHIP_PRINCIPLES,
  STEWARDSHIP_DOCTRINE,
} from "./stewardship.js";

describe("stewardship — doctrine", () => {
  it("declares all thirteen principles", () => {
    assert.equal(STEWARDSHIP_PRINCIPLES.length, 13);
    for (const p of STEWARDSHIP_PRINCIPLES) {
      assert.ok(STEWARDSHIP_DOCTRINE[p], `missing doctrine for ${p}`);
      assert.ok(STEWARDSHIP_DOCTRINE[p].length > 0);
    }
  });
});

describe("stewardship — ship verdict", () => {
  it("approves a small, principled proposal", () => {
    const review = reviewStewardship({
      name: "warm_first_week_card",
      surface: "ui_component",
      description: "A warm acknowledgement on day 7 — no celebration burst.",
      copy: "A full week of rhythm — beautifully done.",
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    });
    assert.equal(review.verdict, "ship");
    assert.equal(review.flags.length, 0);
    assert.equal(passesStewardship({
      name: "warm_first_week_card",
      surface: "ui_component",
      description: "A warm acknowledgement on day 7.",
      copy: "A full week of rhythm — beautifully done.",
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    }), true);
  });
});

describe("stewardship — block conditions", () => {
  it("rejects a new engine", () => {
    const review = reviewStewardship({
      name: "extra_progression_engine",
      surface: "engine",
      description: "Adds a parallel mastery engine.",
      addsNewSystem: true,
    });
    assert.equal(review.verdict, "reject");
    assert.ok(review.flags.some((f) => f.principle === "preserve_one_coherent_system"));
  });

  it("rejects a new dashboard", () => {
    const review = reviewStewardship({
      name: "premium_metrics_dashboard",
      surface: "dashboard",
      description: "Yet another dashboard with retention curves.",
    });
    assert.equal(review.verdict, "reject");
    assert.ok(
      review.flags.some((f) => f.principle === "feature_discipline_depth_over_breadth"),
    );
  });

  it("rejects local unlock / reward / motion / personalization logic", () => {
    const review = reviewStewardship({
      name: "local_streak_unlock",
      surface: "feature",
      description: "Adds its own streak-based unlock list.",
      introducesLocalLogic: true,
    });
    assert.equal(review.verdict, "reject");
    assert.ok(review.flags.some((f) => f.principle === "preserve_one_coherent_system"));
  });

  it("rejects urgency / compulsion copy", () => {
    const review = reviewStewardship({
      name: "streak_save_modal",
      surface: "copy",
      description: "Modal to save your streak.",
      copy: "Don't lose your streak — act now!",
      behindFeatureFlag: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
      usesSharedSystems: true,
    });
    assert.equal(review.verdict, "reject");
    assert.ok(review.flags.some((f) => f.principle === "emotional_safety"));
  });

  it("rejects guardrail-violating copy (diagnostic language)", () => {
    const review = reviewStewardship({
      name: "diagnostic_card",
      surface: "copy",
      description: "Surfaces a learning concern.",
      copy: "Your child may have ADHD — see a specialist.",
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    });
    assert.equal(review.verdict, "reject");
    assert.ok(review.flags.some((f) => f.principle === "emotional_safety"));
  });

  it("rejects compulsion-optimized features", () => {
    const review = reviewStewardship({
      name: "force_streak_pressure",
      surface: "feature",
      description: "Adds streak-pressure mechanics to drive returns.",
      optimizesForCompulsion: true,
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    });
    assert.equal(review.verdict, "reject");
    assert.ok(review.flags.some((f) => f.principle === "long_term_growth"));
  });

  it("rejects unexplainable behavior", () => {
    const review = reviewStewardship({
      name: "blackbox_routing",
      surface: "personalization",
      description: "Routes using a private model.",
      isExplainable: false,
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      respectsPerformance: true,
    });
    assert.equal(review.verdict, "reject");
    assert.ok(review.flags.some((f) => f.principle === "explainability"));
  });
});

describe("stewardship — revise conditions", () => {
  it("asks for a feature flag when missing", () => {
    const review = reviewStewardship({
      name: "auto_difficulty_bump",
      surface: "feature",
      description: "Automatic stretch when the child is doing well.",
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    });
    assert.equal(review.verdict, "revise");
    assert.ok(review.flags.some((f) => f.principle === "philosophy_protection"));
    assert.ok(review.suggestions.some((s) => /feature-flags/.test(s)));
  });

  it("asks for performance budget compliance", () => {
    const review = reviewStewardship({
      name: "particle_explosion",
      surface: "animation",
      description: "100 particle burst on level-up.",
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: false,
    });
    assert.equal(review.verdict, "revise");
    assert.ok(review.flags.some((f) => f.principle === "performance_as_a_feature"));
  });

  it("asks to drop algorithmic language in copy", () => {
    const review = reviewStewardship({
      name: "opaque_recommendation",
      surface: "copy",
      description: "Recommendation reason.",
      copy: "The algorithm picked this for your child.",
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    });
    assert.equal(review.verdict, "revise");
    assert.ok(review.flags.some((f) => f.principle === "explainability"));
  });
});

describe("stewardship — digest", () => {
  it("formats a digest for a flagged proposal", () => {
    const proposal = {
      name: "streak_save_modal",
      surface: "copy" as const,
      description: "Modal to save your streak.",
      copy: "Don't lose your streak!",
    };
    const review = reviewStewardship(proposal);
    const digest = formatStewardshipDigest(proposal, review);
    assert.ok(digest.includes("Stewardship review"));
    assert.ok(digest.includes("streak_save_modal"));
    assert.ok(digest.toLowerCase().includes("reject") || digest.toLowerCase().includes("revise"));
  });

  it("formats a digest for a passing proposal", () => {
    const proposal = {
      name: "warm_session_complete",
      surface: "copy" as const,
      description: "Session complete copy.",
      copy: "A small finished moment — beautiful work.",
      behindFeatureFlag: true,
      usesSharedSystems: true,
      respectsQuietness: true,
      isExplainable: true,
      respectsPerformance: true,
    };
    const review = reviewStewardship(proposal);
    const digest = formatStewardshipDigest(proposal, review);
    assert.ok(/SHIP/i.test(digest));
    assert.ok(digest.includes("respects the platform"));
  });
});
