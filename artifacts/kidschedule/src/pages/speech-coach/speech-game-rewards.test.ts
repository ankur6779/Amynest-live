import { describe, expect, it, beforeEach } from "vitest";
import {
  applyGameSessionRewards,
  coinsForFeedback,
  emptySpeechGameRewards,
  loadSpeechGameRewards,
  saveSpeechGameRewards,
} from "./speech-game-rewards";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    configurable: true,
  });
}

describe("speech-game-rewards", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });
  it("starts empty for a new child", () => {
    expect(loadSpeechGameRewards(42001)).toEqual(emptySpeechGameRewards());
  });

  it("awards more coins for stronger feedback", () => {
    expect(coinsForFeedback("great", 2)).toBe(20);
    expect(coinsForFeedback("close", 2)).toBe(10);
    expect(coinsForFeedback("try_again", 2)).toBe(4);
  });

  it("persists coins, plays, and badges after a session", () => {
    const result = applyGameSessionRewards({
      childId: 42002,
      gameId: "animal_sounds",
      badgeId: "badge_zoo_voice",
      rewardStars: 2,
      results: [
        { feedback: "great", score: 95 },
        { feedback: "close", score: 72 },
      ],
    });

    expect(result.coinsEarned).toBe(30);
    expect(result.badgeUnlocked).toBe(true);
    expect(result.isNewBest).toBe(true);

    const saved = loadSpeechGameRewards(42002);
    expect(saved.coins).toBe(30);
    expect(saved.plays.animal_sounds).toBe(1);
    expect(saved.bestScores.animal_sounds).toBe(84);
    expect(saved.badges).toContain("badge_zoo_voice");
  });

  it("does not duplicate badges on repeat sessions", () => {
    applyGameSessionRewards({
      childId: 42003,
      gameId: "rhyming",
      badgeId: "badge_rhyme_master",
      rewardStars: 2,
      results: [{ feedback: "great", score: 90 }],
    });
    applyGameSessionRewards({
      childId: 42003,
      gameId: "rhyming",
      badgeId: "badge_rhyme_master",
      rewardStars: 2,
      results: [{ feedback: "great", score: 92 }],
    });

    const saved = loadSpeechGameRewards(42003);
    expect(saved.badges.filter((b) => b === "badge_rhyme_master")).toHaveLength(1);
    expect(saved.plays.rhyming).toBe(2);
  });

  it("round-trips through save and load", () => {
    saveSpeechGameRewards(42004, {
      coins: 55,
      badges: ["badge_zoo_voice"],
      plays: { animal_sounds: 2 },
      bestScores: { animal_sounds: 88 },
    });
    expect(loadSpeechGameRewards(42004).coins).toBe(55);
  });
});
