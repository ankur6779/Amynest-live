import { beforeEach, describe, expect, it } from "vitest";
import {
  ageBandFromYears,
  computeMasteryScore,
  formatParentMastery,
  getMasteryStage,
  getPracticeSkillFamily,
  getWeakestPracticeFamilies,
  nextSkillCue,
  recordMasterySession,
  stageFromScore,
  type MasterySessionSample,
} from "./game-mastery";
import {
  getProgressionTable,
  microToUi,
  prepareGameSession,
  resolveContentStage,
  resolveMicroDifficulty,
} from "./game-adaptive-progression";

describe("game-mastery", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps scores to five stages without exposing percentages", () => {
    expect(stageFromScore(0).label).toBe("Starter");
    expect(stageFromScore(25).label).toBe("Growing");
    expect(stageFromScore(45).label).toBe("Confident");
    expect(stageFromScore(65).label).toBe("Explorer");
    expect(stageFromScore(90).label).toBe("Master");
    expect(formatParentMastery("pattern-match", true)).toMatch(/Starter \(1\/5\)/);
  });

  it("grows mastery gradually across a rolling window", () => {
    for (let i = 0; i < 5; i++) {
      recordMasterySession({ gameId: "card-flip", score: 7, total: 8 });
    }
    const stage = getMasteryStage("card-flip");
    expect(stage.id).toBeGreaterThanOrEqual(2);
    expect(stage.label).not.toMatch(/\bLevel\b|\bXP\b/i);
  });

  it("does not crash mastery after one rough session", () => {
    for (let i = 0; i < 4; i++) {
      recordMasterySession({ gameId: "maze-escape", score: 8, total: 8 });
    }
    const before = getMasteryStage("maze-escape");
    recordMasterySession({ gameId: "maze-escape", score: 1, total: 8, frustrated: true });
    const afterScore = computeMasteryScore(
      Array.from({ length: 5 }, (_, i) => ({
        at: i,
        accuracy: i === 4 ? 0.1 : 0.95,
        completed: true,
        consistency: 0.7,
        hintLoad: 0,
        calm: i !== 4,
      })) satisfies MasterySessionSample[],
    );
    expect(afterScore).toBeLessThan(100);
    expect(getMasteryStage("maze-escape").id).toBeGreaterThanOrEqual(before.id - 1);
  });

  it("names practice families for children", () => {
    expect(getPracticeSkillFamily("card-flip")).toBe("Working Memory");
    expect(getPracticeSkillFamily("maze-escape")).toBe("Planning");
    expect(nextSkillCue("Attention")).toMatch(/Strengthen Attention/);
  });

  it("age bands follow DAP defaults", () => {
    expect(ageBandFromYears(3)).toBe("3-4");
    expect(ageBandFromYears(5)).toBe("5-6");
    expect(ageBandFromYears(8)).toBe("7-8");
  });

  it("lists weaker families for recommendations", () => {
    recordMasterySession({ gameId: "pattern-match", score: 8, total: 8 });
    const weak = getWeakestPracticeFamilies(3);
    expect(weak.length).toBeGreaterThan(0);
  });
});

describe("game-adaptive-progression", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps micro bands to Easy/Normal/Hard for children", () => {
    expect(microToUi("easy-")).toBe("easy");
    expect(microToUi("normal+")).toBe("normal");
    expect(microToUi("hard+")).toBe("hard");
  });

  it("prepares age-aware sessions without forcing Hard on ages 3–4", () => {
    const plan = prepareGameSession("number-match", 42); // ~3.5y
    expect(plan.ageBand).toBe("3-4");
    expect(plan.uiDifficulty).toBe("easy");
    expect(plan.contentStage).toBeGreaterThanOrEqual(1);
  });

  it("exposes per-stage progression tables", () => {
    expect(getProgressionTable(1).cardPairs).toBe(3);
    expect(getProgressionTable(4).cardPairs).toBe(8);
    expect(getProgressionTable(5).sequenceReverse).toBe(true);
    expect(getProgressionTable(5).patternMode).toBe("dual");
  });

  it("keeps content stage near mastery", () => {
    expect(resolveContentStage("speed-math", "7-8")).toBeGreaterThanOrEqual(1);
    expect(resolveMicroDifficulty("speed-math", "7-8", "normal")).toBe("normal");
  });
});
