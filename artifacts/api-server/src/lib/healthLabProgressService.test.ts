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
