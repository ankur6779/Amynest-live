import { describe, expect, it } from "vitest";
import {
  validateBreathSession,
  validateFlamingoSession,
  validateFingerSession,
  validateFreezeSession,
  canRewardCalmnessSnapshot,
  applyCheatMultiplier,
} from "./anti-cheat";
import { shouldUnlockFocusMaster, evaluateMasterBadges } from "./badges";
import { getLevelForXp, XP_BY_TIER, HEALTH_LEVELS } from "./constants";
import {
  scoreToTier,
  tierToXp,
  computeBreathScore,
  computeReactionScore,
  computeReactionScoreWithPenalties,
  applyXpModifiers,
  todayWellnessScore,
} from "./scoring";
import {
  defaultHealthLabState,
  appendSessionResult,
  dateKeyLocal,
  incrementQuestProgress,
  trackSessionBurst,
} from "./storage";
import { purchaseItem } from "./shop";
import { rollDailySurprise, weekKey, isGoldenChallengeDay } from "./retention";
import type { GameSessionResult } from "./types";

function session(
  partial: Partial<GameSessionResult> & Pick<GameSessionResult, "gameId" | "score">,
): GameSessionResult {
  return {
    timestamp: Date.now(),
    durationMs: 5000,
    xpEarned: 50,
    xpTier: "silver",
    metrics: { focus: partial.score },
    personalBest: false,
    ...partial,
  };
}

describe("anti-cheat", () => {
  it("rejects taped finger on breath", () => {
    const v = validateBreathSession({
      holdSeconds: 10,
      touchMoves: [0, 0, 0],
      pointerCount: 1,
    });
    expect(v.flags).toContain("taped_finger");
    expect(v.eligibleForBadges).toBe(false);
  });

  it("rejects multi-touch", () => {
    const v = validateBreathSession({
      holdSeconds: 5,
      touchMoves: [1, 2, 3],
      pointerCount: 2,
    });
    expect(v.flags).toContain("multi_touch");
  });

  it("accepts natural micro-movement", () => {
    const v = validateBreathSession({
      holdSeconds: 10,
      touchMoves: [0.5, 1.2, 0.8, 1.5, 0.9],
      pointerCount: 1,
    });
    expect(v.valid).toBe(true);
    expect(v.flags).toHaveLength(0);
  });

  it("detects flat surface on flamingo", () => {
    const v = validateFlamingoSession({
      durationSeconds: 20,
      avgStability: 99,
      variance: 0.001,
      simulated: false,
      minDurationSeconds: 15,
    });
    expect(v.flags).toContain("flat_surface");
  });

  it("marks simulated motion ineligible for badges", () => {
    const v = validateFlamingoSession({
      durationSeconds: 20,
      avgStability: 80,
      variance: 0.05,
      simulated: true,
      minDurationSeconds: 15,
    });
    expect(v.eligibleForBadges).toBe(false);
  });

  it("rejects too-short flamingo session", () => {
    const v = validateFlamingoSession({
      durationSeconds: 5,
      avgStability: 90,
      variance: 0.05,
      simulated: false,
      minDurationSeconds: 15,
    });
    expect(v.flags).toContain("too_short");
  });

  it("caps calmness snapshot rewards", () => {
    expect(canRewardCalmnessSnapshot(["breath-control", "reaction-time"], false)).toBe(false);
    expect(
      canRewardCalmnessSnapshot(
        ["breath-control", "reaction-time", "finger-stability"],
        false,
      ),
    ).toBe(true);
    expect(
      canRewardCalmnessSnapshot(
        ["breath-control", "reaction-time", "finger-stability"],
        true,
      ),
    ).toBe(false);
  });

  it("applies cheat score multiplier", () => {
    expect(applyCheatMultiplier(90, { valid: false, flags: ["taped_finger"], scoreMultiplier: 0, eligibleForBadges: false, eligibleForXp: false })).toBe(0);
  });
});

describe("scoring", () => {
  it("maps score to XP tiers", () => {
    expect(scoreToTier(96)).toBe("perfect");
    expect(tierToXp("perfect")).toBe(XP_BY_TIER.perfect);
    expect(scoreToTier(40)).toBe("bronze");
  });

  it("computes breath score", () => {
    const score = computeBreathScore(30, 90);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes reaction false starts", () => {
    expect(computeReactionScoreWithPenalties(250, 3)).toBeLessThan(computeReactionScore(250));
  });

  it("applies double XP modifier", () => {
    expect(applyXpModifiers(100, { doubleXpDay: true })).toBe(150);
  });

  it("rewards fast reaction times", () => {
    expect(computeReactionScore(180)).toBeGreaterThan(computeReactionScore(450));
  });
});

describe("XP progression", () => {
  it("requires 10000+ XP for level 7", () => {
    const l7 = HEALTH_LEVELS.find((l) => l.id === 7)!;
    expect(l7.xpRequired).toBeGreaterThanOrEqual(10000);
  });

  it("has levels 8-10", () => {
    expect(HEALTH_LEVELS.some((l) => l.id === 10)).toBe(true);
    expect(getLevelForXp(25000).id).toBe(10);
  });

  it("accumulates XP from sessions", () => {
    let state = defaultHealthLabState(1);
    state = appendSessionResult(state, session({ gameId: "breath-control", score: 98, xpEarned: 150, xpTier: "perfect", personalBest: true }));
    expect(state.totalXp).toBe(150);
  });
});

describe("storage", () => {
  it("uses local date keys", () => {
    const d = new Date(2026, 5, 12, 23, 30);
    expect(dateKeyLocal(d)).toBe("2026-06-12");
  });

  it("tracks session burst for speed quest", () => {
    let state = defaultHealthLabState(1);
    state = trackSessionBurst(state, 1000);
    expect(state.sessionBurstCount).toBe(1);
    state = trackSessionBurst(state, 1000);
    expect(state.sessionBurstCount).toBe(2);
  });

  it("completes quests with XP rewards", () => {
    let state = defaultHealthLabState(1);
    const { state: next, newlyCompleted } = incrementQuestProgress(state, "complete-3", 3);
    expect(newlyCompleted).toContain("complete-3");
    expect(next.totalXp).toBeGreaterThan(0);
  });

  it("formats wellness today with local date", () => {
    const dk = dateKeyLocal();
    const score = todayWellnessScore(
      [session({ gameId: "breath-control", score: 80, timestamp: Date.now() })],
      dk,
    );
    expect(score).toBe(80);
  });
});

describe("badges", () => {
  it("unlocks focus master after 8 strong sessions", () => {
    let state = defaultHealthLabState(1);
    const history = Array.from({ length: 8 }, (_, i) =>
      session({ gameId: "breath-control", score: 85, metrics: { focus: 85 }, timestamp: Date.now() - i * 1000 }),
    );
    state = { ...state, gameHistory: history };
    expect(shouldUnlockFocusMaster(state)).toBe(true);
    expect(evaluateMasterBadges(state)).toContain("focus-master");
  });
});

describe("shop", () => {
  it("purchases items with coins", () => {
    const r = purchaseItem([], 200, "pet-rocket-buddy");
    expect(r.ok).toBe(true);
    expect(r.coins).toBe(50);
    expect(r.owned).toContain("pet-rocket-buddy");
  });

  it("rejects insufficient coins", () => {
    const r = purchaseItem([], 10, "pet-crystal-fox");
    expect(r.ok).toBe(false);
  });
});

describe("retention", () => {
  it("rolls daily surprise", () => {
    const s = rollDailySurprise("child-1-2026-06-12");
    expect(["coins", "xp", "chest_hint"]).toContain(s.type);
  });

  it("formats week keys", () => {
    expect(weekKey(new Date(2026, 5, 12))).toMatch(/^\d{4}-W\d+$/);
  });

  it("detects golden challenge day", () => {
    expect(typeof isGoldenChallengeDay()).toBe("boolean");
  });
});

describe("equipment", () => {
  it("equips owned item to slot", async () => {
    const { equipItem } = await import("./equipment");
    const r = equipItem({}, ["hat-star-crown"], "hat-star-crown");
    expect(r.ok).toBe(true);
    expect(r.equipped.head).toBe("hat-star-crown");
  });

  it("covers all seven equipment slots", async () => {
    const { equipItem, ITEM_SLOTS } = await import("./equipment");
    const owned = Object.keys(ITEM_SLOTS);
    const equipped: Record<string, string> = {};
    for (const id of owned) {
      const r = equipItem(equipped, owned, id);
      expect(r.ok).toBe(true);
      Object.assign(equipped, r.equipped);
    }
    const slots = new Set(Object.values(ITEM_SLOTS));
    expect(slots.size).toBe(7);
  });
});

describe("sync merge", () => {
  it("enqueue does not throw", async () => {
    const { enqueueHealthLabSync } = await import("./health-lab-sync");
    expect(() => enqueueHealthLabSync(99)).not.toThrow();
  });
});

describe("freeze validation", () => {
  it("flags simulated freeze sessions for badges", () => {
    const v = validateFreezeSession(true, 0.01);
    expect(v.eligibleForBadges).toBe(false);
  });
});

describe("finger validation", () => {
  it("rejects taped finger", () => {
    const v = validateFingerSession({
      touchMoves: [0, 0, 0],
      maxDrift: 1,
      pointerCount: 1,
      durationSeconds: 15,
    });
    expect(v.flags.length).toBeGreaterThan(0);
  });
});

describe("session rewards", () => {
  it("detects simulation when score is zero but xp granted", async () => {
    const { isSimulationResult } = await import("./lib/session-rewards-utils");
    expect(
      isSimulationResult({
        gameId: "flamingo-balance",
        timestamp: 1,
        durationMs: 1000,
        xpEarned: 25,
        xpTier: "bronze",
        score: 0,
        metrics: {},
        personalBest: false,
        simulated: true,
      }),
    ).toBe(true);
  });

  it("aggregates badge and quest celebrations", async () => {
    const { buildRewardSummary } = await import("./lib/session-rewards-utils");
    const state = defaultHealthLabState(1);
    const summary = buildRewardSummary(
      {
        gameId: "reaction-time",
        timestamp: 1,
        durationMs: 1000,
        xpEarned: 40,
        xpTier: "silver",
        score: 72,
        metrics: {},
        personalBest: false,
      },
      [
        { type: "badge", payload: { id: "first-challenge" } },
        { type: "quest", payload: { id: "complete-3" } },
      ],
      state,
    );
    expect(summary.badges).toHaveLength(1);
    expect(summary.quests).toHaveLength(1);
    expect(summary.starsEarned).toBe(72);
  });
});

describe("play-path (UI helpers)", () => {
  it("picks first unplayed playable game and skips wellness report", async () => {
    const { pickNextPlayableGame, PLAYABLE_GAMES, isMotionGame } = await import("./play-path");
    const state = defaultHealthLabState(1);
    expect(pickNextPlayableGame(state)).toBe(PLAYABLE_GAMES[0].id);
    expect(PLAYABLE_GAMES.every((g) => g.id !== "calmness-meter")).toBe(true);

    state.gamesCompletedToday = ["breath-control", "flamingo-balance"];
    expect(pickNextPlayableGame(state)).toBe("reaction-time");
    expect(isMotionGame("flamingo-balance")).toBe(true);
    expect(isMotionGame("breath-control")).toBe(false);
  });

  it("builds mission coaching for the child", async () => {
    const { getMissionCoaching } = await import("./play-path");
    const state = defaultHealthLabState(1);
    const coaching = getMissionCoaching(state, "Riya", "breath-control");
    expect(coaching.greeting).toContain("Riya");
    expect(coaching.missionLine.length).toBeGreaterThan(0);
    expect(coaching.amyLine.length).toBeGreaterThan(0);
  });

  it("builds parent insight without empty placeholders", async () => {
    const { getParentInsightLine } = await import("./play-path");
    const state = defaultHealthLabState(1);
    const line = getParentInsightLine(state, "Riya");
    expect(line.toLowerCase()).toContain("riya");
    expect(line.includes("—") || line.includes("-")).toBe(true);
  });
});

describe("world-evolution (presentation)", () => {
  it("maps session counts to stages without inventing progression", async () => {
    const { stageFromSessionCount, getWorldEvolution, getHubVitality } = await import(
      "./world-evolution"
    );
    expect(stageFromSessionCount(0)).toBe(0);
    expect(stageFromSessionCount(1)).toBe(1);
    expect(stageFromSessionCount(3)).toBe(2);
    expect(stageFromSessionCount(6)).toBe(3);
    expect(stageFromSessionCount(8)).toBe(4);

    const state = defaultHealthLabState(1);
    expect(getWorldEvolution(state, "breath-control").stage).toBe(0);
    expect(getHubVitality(state)).toBe(0);

    state.gameHistory = [
      session({ gameId: "breath-control", score: 50 }),
      session({ gameId: "breath-control", score: 60 }),
      session({ gameId: "reaction-time", score: 40 }),
    ];
    const balloon = getWorldEvolution(state, "breath-control");
    expect(balloon.lifetimeSessions).toBe(2);
    expect(balloon.stage).toBe(2);
    expect(balloon.milestoneLabel.length).toBeGreaterThan(0);
    expect(balloon.friendEmoji).toBe("🐦");
    expect(getHubVitality(state)).toBe(2);
  });

  it("remembers yesterday restorations and today celebrations", async () => {
    const { getWorldEvolution, getHubMemoryLine, getAmyWorldStoryLine } = await import(
      "./world-evolution"
    );
    const state = defaultHealthLabState(1);
    const yesterday = Date.now() - 86400000;
    state.gameHistory = [
      session({ gameId: "freeze-statue", score: 70, timestamp: yesterday }),
    ];
    const garden = getWorldEvolution(state, "freeze-statue");
    expect(garden.helpedYesterday).toBe(true);
    expect(garden.memoryLine.toLowerCase()).toContain("yesterday");

    state.gamesCompletedToday = ["freeze-statue"];
    const celebrating = getWorldEvolution(state, "freeze-statue");
    expect(celebrating.helpedToday).toBe(true);
    expect(celebrating.memoryLine.toLowerCase()).toMatch(/today|celebrating/);

    const hub = getHubMemoryLine(state);
    expect(hub).toBeTruthy();
    expect(getAmyWorldStoryLine(state, "breath-control")).toBeTruthy();
  });
});
