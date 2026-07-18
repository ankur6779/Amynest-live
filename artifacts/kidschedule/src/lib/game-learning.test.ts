import { describe, expect, it } from "vitest";
import { GAMES } from "./games";
import {
  formatLearningMetaLine,
  getChildLearningReflection,
  getGameLearning,
  getLearningPracticeSummary,
  listLearningProfiles,
  type ExecutiveFunction,
} from "./game-learning";

const ALL_EF: ExecutiveFunction[] = [
  "working-memory",
  "attention",
  "inhibitory-control",
  "cognitive-flexibility",
  "planning",
  "visual-processing",
  "processing-speed",
  "problem-solving",
];

describe("game-learning", () => {
  it("covers every catalog game with primary skill + age bands", () => {
    for (const game of GAMES) {
      const L = getGameLearning(game);
      expect(L.primary.length).toBeGreaterThan(8);
      expect(L.secondary.length).toBeGreaterThan(4);
      expect(L.skillName.length).toBeGreaterThan(2);
      expect(L.ageBands.length).toBeGreaterThan(0);
      expect(L.childHowTo.split(/\s+/).length).toBeLessThanOrEqual(14);
      expect(L.whyItMatters.length).toBeGreaterThan(20);
      expect(L.ef.length).toBeGreaterThan(0);
      for (const ef of L.ef) expect(ALL_EF).toContain(ef);
    }
    expect(listLearningProfiles()).toHaveLength(GAMES.length);
  });

  it("formats parent meta lines with skill, time, and age", () => {
    const math = GAMES.find((g) => g.id === "number-match")!;
    expect(formatLearningMetaLine(math, 2)).toMatch(/Counting sense · ~2 min · Ages 3–6/);
  });

  it("keeps practice summaries effort-positive", () => {
    const game = GAMES.find((g) => g.id === "card-flip")!;
    const low = getLearningPracticeSummary(game, 2, 10);
    expect(low.headline).toMatch(/Working memory/i);
    expect(low.body).toMatch(/Brave trying|Steady practice|Strong accuracy/i);
    expect(low.tip).toMatch(/Tip:/i);
    expect(getChildLearningReflection(game)).toMatch(/practised working memory/i);
  });

  it("maps age 3–4 friendly starters", () => {
    const starters = ["number-match", "shape-match", "card-flip", "color-fill"];
    for (const id of starters) {
      expect(getGameLearning(id).ageBands).toContain("3-4");
    }
  });

  it("flags speed-math as older-band primary", () => {
    const L = getGameLearning("speed-math");
    expect(L.ageBands).toContain("7-8");
    expect(L.ageBands).not.toContain("3-4");
    expect(L.riskNote).toMatch(/timer|Easy|stress/i);
  });
});
