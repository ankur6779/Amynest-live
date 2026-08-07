import { describe, expect, it } from "vitest";
import {
  AMYNEST_PRINCIPLES,
  FORBIDDEN_VOICE_PATTERNS,
  PREMIUM_VOICE,
  QUESTION_TAX_LAW,
  answerLeftParentSmarter,
  mayAskParentQuestion,
  notificationFeelsLighter,
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
