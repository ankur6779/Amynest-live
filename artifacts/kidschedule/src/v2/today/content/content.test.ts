import { describe, expect, it } from "vitest";
import {
  buildMissionWhyLine,
  buildTodayFocusBanner,
  worryDisplayLabel,
} from "./focus";
import { buildTodayGreeting } from "./greeting";
import { buildTodayMessage } from "./message";

describe("Today greeting (parent-facing)", () => {
  it("merges name + concern into one hero (no focus chip)", () => {
    expect(
      buildTodayGreeting({
        name: "Aarav",
        ageBand: "preschool_3_5",
        worry: "speech_talking",
      }).headline,
    ).toBe("Today for Aarav · Speech & talking");
  });

  it("falls back without name or worry", () => {
    expect(
      buildTodayGreeting({ name: null, ageBand: null, worry: null }).headline,
    ).toBe("Here's today's step");
  });

  it("includes age context only in subline (concern is in hero)", () => {
    const g = buildTodayGreeting({
      name: "Riya",
      ageBand: "toddler_1_2",
      worry: "sleep",
    });
    expect(g.headline).toBe("Today for Riya · Sleep");
    expect(g.subline).toMatch(/1–2 years/i);
    expect(g.subline.toLowerCase()).not.toMatch(/amy knows|sleep is on/);
  });

  it("never addresses the child as you in the headline", () => {
    const g = buildTodayGreeting({
      name: "Aarav",
      ageBand: "preschool_3_5",
      worry: "speech_talking",
    });
    expect(g.headline.toLowerCase()).not.toMatch(/^good to see you/);
    expect(g.headline.toLowerCase()).not.toMatch(/\byou,?\s*aarav\b/);
  });

  it("is stable for the same inputs", () => {
    const input = {
      name: "Aarav",
      ageBand: "child_6_8" as const,
      worry: "mornings" as const,
    };
    expect(buildTodayGreeting(input)).toEqual(buildTodayGreeting(input));
  });
});

describe("Today's Message (deterministic)", () => {
  it("personalizes speech worry with name", () => {
    const msg = buildTodayMessage({ name: "Aarav", worry: "speech_talking" });
    expect(msg).toContain("Aarav");
    expect(msg.toLowerCase()).toMatch(/talking|amy remembers/);
  });

  it("honors sleep without apologetic speech framing", () => {
    const sleep = buildTodayMessage({ name: "Riya", worry: "sleep" });
    expect(sleep).toMatch(/Sleep/i);
    expect(sleep).toContain("Riya");
    expect(sleep.toLowerCase()).not.toMatch(/even with sleep/);
    expect(sleep.toLowerCase()).not.toMatch(/still helps/);
  });

  it("varies by worry without randomness", () => {
    const sleep = buildTodayMessage({ name: null, worry: "sleep" });
    const speech = buildTodayMessage({ name: null, worry: "speech_talking" });
    expect(sleep).not.toBe(speech);
    expect(buildTodayMessage({ name: null, worry: "sleep" })).toBe(sleep);
  });

  it("uses default when worry missing", () => {
    const msg = buildTodayMessage({ name: null, worry: null });
    expect(msg.length).toBeGreaterThan(10);
    expect(msg.toLowerCase()).toMatch(/step|amy/);
  });
});

describe("Today's Focus banner + mission why (presentation)", () => {
  it("builds focus banner from existing worry only", () => {
    expect(buildTodayFocusBanner({ worry: "sleep" })).toBe("Today's focus: Sleep");
    expect(buildTodayFocusBanner({ worry: "behavior" })).toBe(
      "Today's focus: Behavior",
    );
    expect(buildTodayFocusBanner({ worry: null })).toBeNull();
    expect(buildTodayFocusBanner(null)).toBeNull();
  });

  it("maps worry labels from Front Door options", () => {
    expect(worryDisplayLabel("speech_talking")).toBe("Speech & talking");
    expect(worryDisplayLabel("learning_school")).toBe("Learning / school");
  });

  it("still builds mission why-line (kept for callers; Today no longer stacks it)", () => {
    const why = buildMissionWhyLine({ name: "Aarav", worry: "sleep" });
    expect(why).toMatch(/Sleep/i);
    expect(why).toContain("Aarav");
    expect(buildMissionWhyLine({ name: null, worry: null })).toBeNull();
  });
});
