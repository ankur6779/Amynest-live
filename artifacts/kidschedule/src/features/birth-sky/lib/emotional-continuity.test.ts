import { describe, expect, it } from "vitest";
import type { CosmicMemory } from "./cosmic-memory";
import {
  buildContinuityAmyOpener,
  buildReturnContinuityLine,
  gatherContinuityFacts,
  livingSkyFamiliarityClass,
  resolveFamiliarity,
} from "./emotional-continuity";

function mem(partial: Partial<CosmicMemory>): CosmicMemory {
  return {
    visitCount: 1,
    lastVisitAt: 0,
    chaptersOpened: [],
    lastPlanet: null,
    planetsVisited: [],
    aiOpened: 0,
    celebrationsShown: [],
    greetingIndex: 0,
    ...partial,
  };
}

describe("emotional continuity", () => {
  it("resolves familiarity tiers from visit count", () => {
    expect(resolveFamiliarity(1)).toBe("new");
    expect(resolveFamiliarity(3)).toBe("returning");
    expect(resolveFamiliarity(8)).toBe("familiar");
    expect(resolveFamiliarity(20)).toBe("dear");
  });

  it("never invents chapters or milestones", () => {
    const facts = gatherContinuityFacts({
      memory: mem({ visitCount: 5 }),
      previousLastVisitAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      emittedMilestones: [],
    });
    expect(facts.lastChapterLabel).toBeNull();
    expect(facts.pendingMilestone).toBeNull();
    expect(facts.portraitSaved).toBe(false);
    expect(buildReturnContinuityLine(facts, "Ada")).toBeTruthy();
  });

  it("references only stored chapter and portrait", () => {
    const facts = gatherContinuityFacts({
      memory: mem({
        visitCount: 4,
        chaptersOpened: ["emotional"],
        portraitSavedCount: 1,
        lastPlanet: "moon",
      }),
    });
    expect(facts.lastChapterLabel).toBe("The Inner Weather");
    expect(facts.portraitSaved).toBe(true);
    const line = buildReturnContinuityLine(facts, "Ada");
    expect(line).toMatch(/portrait|Inner Weather/i);
    expect(line).not.toMatch(/fabricat|invent/i);
  });

  it("surfaces pending reflection milestones once", () => {
    const facts = gatherContinuityFacts({
      memory: mem({
        visitCount: 3,
        celebrationsShown: [],
      }),
      emittedMilestones: ["reflection_milestone_1"],
    });
    expect(facts.pendingMilestone).toBe("reflection_milestone_1");
    const opener = buildContinuityAmyOpener("Ada", facts, 0);
    expect(opener).toMatch(/first quiet note|new star/i);
  });

  it("skips continuity opener for first visit", () => {
    const facts = gatherContinuityFacts({
      memory: mem({ visitCount: 1 }),
    });
    expect(buildContinuityAmyOpener("Ada", facts, 0)).toBeNull();
    expect(livingSkyFamiliarityClass(facts)).toBe("amy-sky-familiarity--new");
  });

  it("rotates openers without repeating avoided lines", () => {
    const facts = gatherContinuityFacts({
      memory: mem({
        visitCount: 6,
        chaptersOpened: ["learning"],
        aiOpened: 1,
        lastPlanet: "sun",
      }),
    });
    const first = buildContinuityAmyOpener("Ada", facts, 0);
    expect(first).toBeTruthy();
    const second = buildContinuityAmyOpener("Ada", facts, 0, [first!]);
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });
});
