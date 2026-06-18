import { describe, expect, it, beforeEach } from "vitest";
import {
  clearLocalSnapshot,
  loadLocalSnapshot,
  saveLocalSnapshot,
} from "./storage";

describe("speech coach v2 local snapshot (TEST 6 refresh recovery)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and restores phase, stars, and session identity after refresh", () => {
    const snapshot = {
      childId: 7,
      sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      tabLockToken: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      updatedAt: new Date().toISOString(),
      sessionState: {
        sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        childId: 7,
        childName: "Riya",
        ageBand: "4-5" as const,
        phase: "guided_practice" as const,
        phaseStartedAt: Date.now(),
        sessionStartedAt: Date.now(),
        exerciseIndex: 2,
        exercises: [],
        phaseAttempts: 1,
        phaseSuccesses: 1,
        starsEarned: 4,
        pointsEarned: 40,
        wordsSpoken: 8,
        sentencesCompleted: 2,
        turnCount: 3,
      },
    };

    saveLocalSnapshot(snapshot);
    const loaded = loadLocalSnapshot(7);

    expect(loaded?.sessionId).toBe(snapshot.sessionId);
    expect(loaded?.tabLockToken).toBe(snapshot.tabLockToken);
    expect(loaded?.sessionState.phase).toBe("guided_practice");
    expect(loaded?.sessionState.exerciseIndex).toBe(2);
    expect(loaded?.sessionState.starsEarned).toBe(4);

    clearLocalSnapshot(7);
    expect(loadLocalSnapshot(7)).toBeNull();
  });
});
