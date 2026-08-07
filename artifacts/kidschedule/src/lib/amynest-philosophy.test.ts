import { describe, expect, it } from "vitest";
import {
  AMYNEST_PRINCIPLES,
  FORBIDDEN_VOICE_PATTERNS,
  MANUFACTURING_AUTO_FAIL,
  MANUFACTURING_SIX_REVIEWS,
  PREMIUM_VOICE,
  QUESTION_TAX_LAW,
  REUSE_BEFORE_REWRITE_LAW,
  TODAY_HOME_HUB_BOUNDARY_LAW,
  TODAY_HOME_LAW,
  answerLeftParentSmarter,
  isManufacturingComplete,
  mayAskParentQuestion,
  mayCreateNewImplementation,
  notificationFeelsLighter,
  passesTodayHomeLaw,
  resolveHomeHubBoundary,
  violatesAmyNestVoice,
} from "./amynest-philosophy";
import { PRE_SIGNUP_MESSAGES } from "./pre-signup-reengagement/content";

describe("AmyNest philosophy", () => {
  it("defines five immutable principles", () => {
    expect(AMYNEST_PRINCIPLES).toHaveLength(5);
    expect(AMYNEST_PRINCIPLES.map((p) => p.id)).toEqual([
      "understand",
      "trust-first",
      "remember-kindly",
      "life-continues",
      "calm-companionship",
    ]);
  });

  it("locks the Six Reviews Manufacturing Law", () => {
    expect(MANUFACTURING_SIX_REVIEWS).toHaveLength(6);
    expect(MANUFACTURING_SIX_REVIEWS.map((r) => r.id)).toEqual([
      "founder",
      "parent",
      "apple-craft",
      "engineering",
      "database",
      "growth",
    ]);
    expect(MANUFACTURING_AUTO_FAIL).toEqual([
      "Beautiful but unstable",
      "Technically perfect but emotionally weak",
      "Good UX but poor conversion",
      "Good conversion but broken trust",
    ]);
    expect(
      isManufacturingComplete({
        founder: true,
        parent: true,
        "apple-craft": true,
        engineering: true,
        database: true,
        growth: true,
      }),
    ).toBe(true);
    expect(
      isManufacturingComplete({
        founder: true,
        parent: true,
        "apple-craft": true,
        engineering: true,
        database: true,
        growth: false,
      }),
    ).toBe(false);
  });

  it("locks Reuse Before Rewrite and blocks unjustified greenfield", () => {
    expect(REUSE_BEFORE_REWRITE_LAW.id).toBe("reuse-before-rewrite");
    expect(REUSE_BEFORE_REWRITE_LAW.axioms).toHaveLength(3);
    expect(
      mayCreateNewImplementation({
        existingCapabilityDiscovered: false,
        existingArchitectureSupportsUseCase: false,
      }).action,
    ).toBe("discover-first");
    expect(
      mayCreateNewImplementation({
        existingCapabilityDiscovered: true,
        existingArchitectureSupportsUseCase: true,
      }),
    ).toEqual({
      allowedNewImplementation: false,
      action: "reuse-or-refactor",
      reason: "Reuse or safely refactor the existing implementation.",
    });
    expect(
      mayCreateNewImplementation({
        existingCapabilityDiscovered: true,
        existingArchitectureSupportsUseCase: false,
      }).allowedNewImplementation,
    ).toBe(true);
  });

  it("locks the Question Tax Law axioms", () => {
    expect(QUESTION_TAX_LAW.id).toBe("question-tax");
    expect(QUESTION_TAX_LAW.axioms).toEqual([
      "Every additional question is a tax.",
      "Every tap must earn its existence.",
      "If the product can infer safely, never ask.",
      "If the product must ask, immediately demonstrate why the answer mattered.",
      "Parents should feel smarter after every answer, never more tired.",
    ]);
  });

  it("locks the Today Home Law — product decides next, parent never chooses among options", () => {
    expect(TODAY_HOME_LAW.id).toBe("today-home");
    expect(TODAY_HOME_LAW.axioms).toEqual([
      "If the parent has to decide what to do next, Today Home has failed.",
      "If Today Home has to decide what to do next, AmyNest has succeeded.",
    ]);
    expect(
      passesTodayHomeLaw({
        parentMustDecideWhatToDoNext: true,
        productDecidesWhatToDoNext: true,
      }).passed,
    ).toBe(false);
    expect(
      passesTodayHomeLaw({
        parentMustDecideWhatToDoNext: false,
        productDecidesWhatToDoNext: false,
      }).passed,
    ).toBe(false);
    expect(
      passesTodayHomeLaw({
        parentMustDecideWhatToDoNext: false,
        productDecidesWhatToDoNext: true,
      }),
    ).toEqual({
      passed: true,
      reason: "If Today Home has to decide what to do next, AmyNest has succeeded.",
    });
  });

  it("locks Home↔Hub boundary — action today vs change in thinking", () => {
    expect(TODAY_HOME_HUB_BOUNDARY_LAW.id).toBe("today-home-hub-boundary");
    expect(TODAY_HOME_HUB_BOUNDARY_LAW.axioms).toEqual([
      "If the answer can be completed today, it belongs to Today Home.",
      "If the answer changes how the parent thinks, it belongs to Parent Hub.",
      "Never confuse action with understanding.",
    ]);
    expect(
      resolveHomeHubBoundary({
        answerCanBeCompletedToday: true,
        answerChangesHowParentThinks: false,
      }).surface,
    ).toBe("today-home");
    expect(
      resolveHomeHubBoundary({
        answerCanBeCompletedToday: false,
        answerChangesHowParentThinks: true,
      }).surface,
    ).toBe("parent-hub");
    expect(
      resolveHomeHubBoundary({
        answerCanBeCompletedToday: true,
        answerChangesHowParentThinks: true,
      }).surface,
    ).toBe("ambiguous");
    expect(
      resolveHomeHubBoundary({
        answerCanBeCompletedToday: false,
        answerChangesHowParentThinks: false,
      }).surface,
    ).toBe("neither");
  });

  it("never asks when inference is safe", () => {
    const gate = mayAskParentQuestion({
      canInferSafely: true,
      tapEarnsExistence: true,
      willDemonstrateWhyImmediately: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/never ask/i);
  });

  it("refuses questions that do not earn the tap or prove value", () => {
    expect(
      mayAskParentQuestion({
        canInferSafely: false,
        tapEarnsExistence: false,
        willDemonstrateWhyImmediately: true,
      }).allowed,
    ).toBe(false);
    expect(
      mayAskParentQuestion({
        canInferSafely: false,
        tapEarnsExistence: true,
        willDemonstrateWhyImmediately: false,
      }).allowed,
    ).toBe(false);
  });

  it("allows a single earned ask that proves value immediately", () => {
    const gate = mayAskParentQuestion({
      canInferSafely: false,
      tapEarnsExistence: true,
      willDemonstrateWhyImmediately: true,
    });
    expect(gate.allowed).toBe(true);
    expect(
      answerLeftParentSmarter({
        demonstratedWhy: true,
        addedCognitiveLoadWithoutValue: false,
      }),
    ).toBe(true);
    expect(
      answerLeftParentSmarter({
        demonstratedWhy: false,
        addedCognitiveLoadWithoutValue: true,
      }),
    ).toBe(false);
  });

  it("rejects pressure language", () => {
    expect(violatesAmyNestVoice("Unlock Premium now")).toBe(true);
    expect(violatesAmyNestVoice("We've missed you")).toBe(true);
    expect(violatesAmyNestVoice("Protect your 7-day streak")).toBe(true);
    expect(violatesAmyNestVoice("I've been thinking about Aria")).toBe(true);
    expect(violatesAmyNestVoice("Today feels gentle.")).toBe(false);
  });

  it("premium voice never unlocks or urgencies", () => {
    expect(violatesAmyNestVoice(PREMIUM_VOICE.invitation)).toBe(false);
    expect(violatesAmyNestVoice(PREMIUM_VOICE.continueCta)).toBe(false);
    expect(PREMIUM_VOICE.invitation).toMatch(/whenever you're ready/i);
  });

  it("pre-signup messages obey companion voice", () => {
    for (const msg of PRE_SIGNUP_MESSAGES) {
      expect(violatesAmyNestVoice(`${msg.title} ${msg.body}`), msg.title).toBe(false);
      expect(notificationFeelsLighter(msg.body), msg.body).toBe(true);
    }
  });

  it("forbidden patterns stay intentional and finite", () => {
    expect(FORBIDDEN_VOICE_PATTERNS.length).toBeGreaterThan(8);
  });
});
