import { describe, expect, it } from "vitest";
import {
  estimateReadingMinutes,
  moonPhasePhrase,
  moonPhasePhraseLower,
  withIndefiniteArticle,
} from "./sky-copy";
import { buildPersonalizedGreeting } from "./personalized-greetings";
import { buildDeepInsightSections } from "../constants/deep-insights-content";

describe("sky-copy grammar helpers", () => {
  it("uses an before vowel-starting signs", () => {
    expect(withIndefiniteArticle("Aries")).toBe("an Aries");
    expect(withIndefiniteArticle("Leo")).toBe("a Leo");
  });

  it("does not duplicate Moon in phase phrases", () => {
    expect(moonPhasePhrase("Full Moon")).toBe("Full Moon");
    expect(moonPhasePhrase("Waxing Gibbous")).toBe("Waxing Gibbous Moon");
    expect(moonPhasePhraseLower("Full Moon")).toBe("full Moon");
  });

  it("estimates reading minutes from words", () => {
    expect(estimateReadingMinutes("word ".repeat(200))).toBe(1);
    expect(estimateReadingMinutes("word ".repeat(400))).toBe(2);
  });
});

describe("personalized greetings", () => {
  it("never says Welcome back, there", () => {
    const g = buildPersonalizedGreeting({
      parentFirstName: null,
      childName: "John",
      moonPhaseLabel: "Full Moon",
      sunSign: "Aries",
      moonSign: "Libra",
      daySky: true,
      greetingIndex: 2,
    });
    expect(g.hello).not.toMatch(/there/i);
    expect(g.hello).toMatch(/Welcome back/i);
    expect(g.moonLead).not.toMatch(/Moon Moon/i);
  });
});

describe("deep insight chapters", () => {
  it("has no broken glue sentences or Full Moon Moon", () => {
    const sections = buildDeepInsightSections({
      childName: "John",
      sunSign: "Aries",
      moonSign: "Libra",
      risingSign: null,
      moonPhaseLabel: "Full Moon",
      daySky: true,
    });
    const joined = sections.map((s) => s.body).join("\n");
    expect(joined).not.toMatch(/reward learning thrives/i);
    expect(joined).not.toMatch(/respect warmth is balance/i);
    expect(joined).not.toMatch(/protect growth softens/i);
    expect(joined).not.toMatch(/Moon Moon/i);
    expect(joined).not.toMatch(/soft notebook of moments[\s\S]*soft notebook of moments/);
    // endings vary — not all identical
    const endings = sections.map((s) => s.body.trim().split("\n\n").slice(-2).join("|"));
    expect(new Set(endings).size).toBeGreaterThan(5);
  });
});
