import { describe, expect, it } from "vitest";
import {
  AMYNEST_PRINCIPLES,
  FORBIDDEN_VOICE_PATTERNS,
  PREMIUM_VOICE,
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
