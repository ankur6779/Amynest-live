import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProfiles } from "./healthLabProgressService.js";

test("mergeProfiles prefers client when newer timestamp", () => {
  const server = { version: 2, childId: 1, totalXp: 100, coins: 10, streakDays: 2, badges: [] };
  const client = { version: 2, childId: 1, totalXp: 200, coins: 5, streakDays: 1, badges: [] };
  const { profile, winner } = mergeProfiles(server, client, 1000, 2000);
  assert.equal(winner, "merge");
  assert.equal(profile.totalXp, 200);
  assert.equal(profile.coins, 10);
  assert.equal(profile.streakDays, 2);
});

test("mergeProfiles deduplicates badges by id", () => {
  const server = {
    version: 2,
    childId: 1,
    totalXp: 0,
    coins: 0,
    streakDays: 0,
    badges: [{ id: "first-challenge", unlockedAt: 100 }],
  };
  const client = {
    version: 2,
    childId: 1,
    totalXp: 0,
    coins: 0,
    streakDays: 0,
    badges: [
      { id: "first-challenge", unlockedAt: 200 },
      { id: "streak-7", unlockedAt: 300 },
    ],
  };
  const { profile } = mergeProfiles(server, client, 1000, 2000);
  const badges = profile.badges as { id: string; unlockedAt: number }[];
  assert.equal(badges.length, 2);
  assert.equal(badges.find((b) => b.id === "first-challenge")?.unlockedAt, 200);
});

test("mergeProfiles unions game history by timestamp", () => {
  const server = {
    version: 2,
    childId: 1,
    totalXp: 0,
    coins: 0,
    streakDays: 0,
    badges: [],
    gameHistory: [{ gameId: "breath-control", timestamp: 100, durationMs: 1000, xpEarned: 10, xpTier: "good", score: 80 }],
  };
  const client = {
    version: 2,
    childId: 1,
    totalXp: 0,
    coins: 0,
    streakDays: 0,
    badges: [],
    gameHistory: [{ gameId: "reaction-time", timestamp: 200, durationMs: 500, xpEarned: 15, xpTier: "great", score: 90 }],
  };
  const { profile } = mergeProfiles(server, client, 1000, 2000);
  const history = profile.gameHistory as { timestamp: number }[];
  assert.equal(history.length, 2);
  assert.equal(history[0]?.timestamp, 100);
  assert.equal(history[1]?.timestamp, 200);
});

test("mergeProfiles keeps server when client is older", () => {
  const server = { version: 2, childId: 1, totalXp: 500, coins: 50, streakDays: 5, badges: [] };
  const client = { version: 2, childId: 1, totalXp: 9999, coins: 9999, streakDays: 99, badges: [] };
  const { profile, winner } = mergeProfiles(server, client, 5000, 1000);
  assert.equal(winner, "server");
  assert.equal(profile.totalXp, 500);
});

test("mergeProfiles accepts empty server", () => {
  const client = { version: 2, childId: 1, totalXp: 10, coins: 0, streakDays: 0, badges: [] };
  const { profile, winner } = mergeProfiles(null, client, 0, 1000);
  assert.equal(winner, "client");
  assert.equal(profile.totalXp, 10);
});

test("virgin NOW-stamp client does not wipe richer server level/unlocks/PBs", () => {
  const server = {
    version: 2,
    childId: 1,
    totalXp: 1200,
    coins: 55,
    level: 5,
    prestige: 1,
    streakDays: 12,
    questStreakDays: 4,
    totalSessions: 40,
    badges: [{ id: "flamingo-king", unlockedAt: 9000 }],
    avatarId: "hero",
    unlockedAvatarItems: ["hat", "cape"],
    equippedItems: { hat: "hat" },
    personalBests: { "breath-control": 90 },
    wellnessScores: { calmness: 80, focus: 70 },
    gamesCompletedToday: ["breath-control"],
    gameHistory: [
      {
        gameId: "breath-control",
        timestamp: 9000,
        durationMs: 1000,
        xpEarned: 50,
        xpTier: "good",
        score: 90,
      },
    ],
  };
  const virginClient = {
    version: 2,
    childId: 1,
    totalXp: 40,
    coins: 10,
    level: 1,
    prestige: 0,
    streakDays: 1,
    questStreakDays: 0,
    totalSessions: 1,
    badges: [],
    avatarId: "explorer",
    unlockedAvatarItems: [],
    equippedItems: {},
    personalBests: {},
    wellnessScores: { calmness: 0, focus: 0 },
    gamesCompletedToday: [],
    gameHistory: [
      {
        gameId: "reaction-time",
        timestamp: 9500,
        durationMs: 800,
        xpEarned: 40,
        xpTier: "good",
        score: 60,
      },
    ],
  };

  const { profile, winner } = mergeProfiles(server, virginClient, 1000, Date.now());
  assert.equal(winner, "merge");
  assert.equal(profile.totalXp, 1200);
  assert.equal(profile.coins, 55);
  assert.equal(profile.streakDays, 12);
  assert.equal(profile.level, 5);
  assert.equal(profile.prestige, 1);
  assert.equal(profile.questStreakDays, 4);
  assert.equal(profile.totalSessions, 40);
  assert.equal(profile.avatarId, "hero");
  assert.deepEqual(profile.unlockedAvatarItems, ["hat", "cape"]);
  assert.equal((profile.personalBests as Record<string, number>)["breath-control"], 90);
  assert.equal((profile.wellnessScores as Record<string, number>).calmness, 80);
  assert.equal((profile.gameHistory as unknown[]).length, 2);
  assert.equal((profile.badges as unknown[]).length, 1);
});
