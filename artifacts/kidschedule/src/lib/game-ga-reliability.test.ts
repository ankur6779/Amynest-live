/**
 * Phase 9 — GA reliability probes (storage corruption, mastery persistence, offline).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  getGameMastery,
  getMasteryStage,
  recordMasterySession,
} from "./game-mastery";
import { durableFinishGame, getPendingPlaySyncCount } from "./game-finish";
import { prepareGameSession, getActiveSessionPlan } from "./game-adaptive-progression";

describe("GA reliability — mastery & storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("survives corrupted mastery JSON without throwing", () => {
    localStorage.setItem("amynest_game_mastery_v1", "{broken");
    expect(() => getMasteryStage("pattern-match")).not.toThrow();
    expect(getMasteryStage("pattern-match").label).toBe("Starter");
    recordMasterySession({ gameId: "pattern-match", score: 8, total: 8 });
    expect(getGameMastery("pattern-match").samples.length).toBe(1);
  });

  it("ignores garbage mastery records while keeping valid ones", () => {
    localStorage.setItem(
      "amynest_game_mastery_v1",
      JSON.stringify({
        "card-flip": { score: 40, samples: [{ at: 1, accuracy: 0.8, completed: true, consistency: 0.7, hintLoad: 0, calm: true }], updatedAt: 1 },
        "bad-game": "nope",
        "speed-math": { score: "x", samples: null },
      }),
    );
    expect(getMasteryStage("card-flip").label).toBe("Confident");
    expect(getGameMastery("speed-math").score).toBe(0);
  });

  it("persists mastery across five consecutive finishes (long session)", async () => {
    for (let i = 0; i < 5; i++) {
      await durableFinishGame({
        gameId: "sequence",
        score: 7,
        total: 8,
        perfect: false,
        pointsEarned: 10,
        isSignedIn: false,
      });
    }
    expect(getGameMastery("sequence").samples.length).toBeGreaterThanOrEqual(1);
    expect(getMasteryStage("sequence").id).toBeGreaterThanOrEqual(2);
  });

  it("session plan survives prepare → read after localStorage round-trip", () => {
    prepareGameSession("number-match", 48);
    const plan = getActiveSessionPlan();
    expect(plan?.gameId).toBe("number-match");
    expect(plan?.uiDifficulty).toBe("easy");
  });
});

describe("GA reliability — offline queue", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  });

  it("never blocks result when offline and signed-in", async () => {
    const out = await durableFinishGame({
      gameId: "target-tap",
      score: 10,
      total: 12,
      perfect: false,
      pointsEarned: 11,
      isSignedIn: true,
      authFetch: (async () => {
        throw new Error("should not be called offline");
      }) as typeof fetch,
      idempotencyKey: "play:target-tap:ga-offline",
    });
    expect(out.syncPending).toBe(true);
    expect(getPendingPlaySyncCount()).toBe(1);
    expect(getGameMastery("target-tap").samples.length).toBe(1);
  });
});
