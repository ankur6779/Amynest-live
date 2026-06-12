/**
 * Simulates Device A / Device B sync scenarios without physical hardware.
 * Validates data integrity guarantees for launch checklist Step 2.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProfiles } from "./healthLabProgressService.js";

type Profile = Record<string, unknown>;

function baseProfile(childId: number): Profile {
  return {
    version: 2,
    childId,
    totalXp: 0,
    coins: 100,
    level: 1,
    streakDays: 0,
    badges: [],
    avatarId: "default",
    unlockedAvatarItems: [],
    equippedItems: {},
    gameHistory: [],
    completedQuests: [] as string[],
  };
}

function session(gameId: string, ts: number, xp: number) {
  return { gameId, timestamp: ts, durationMs: 30_000, xpEarned: xp, xpTier: "good", score: 75 };
}

function badge(id: string, at: number) {
  return { id, unlockedAt: at };
}

test("Device A plays → Device B hydrates with merged XP and history", () => {
  const childId = 99;
  const serverTs = 1000;
  const clientTs = 2000;

  const deviceA: Profile = {
    ...baseProfile(childId),
    totalXp: 150,
    coins: 80,
    gameHistory: [session("breath-control", 1001, 50)],
    badges: [badge("first-challenge", 1001)],
    completedQuests: ["daily-play"],
    streakDays: 3,
  };

  const deviceBLocal: Profile = baseProfile(childId);
  const { profile } = mergeProfiles(deviceBLocal, deviceA, serverTs, clientTs);

  assert.equal(profile.totalXp, 150);
  assert.equal(profile.coins, 100);
  assert.equal((profile.gameHistory as unknown[]).length, 1);
  assert.equal((profile.badges as { id: string }[]).length, 1);
  assert.equal(profile.streakDays, 3);
});

test("Device B earns badge offline → merge deduplicates with Device A", () => {
  const childId = 99;
  const server: Profile = {
    ...baseProfile(childId),
    totalXp: 200,
    badges: [badge("first-challenge", 1000)],
    gameHistory: [session("reaction-time", 1000, 40)],
  };
  const client: Profile = {
    ...baseProfile(childId),
    totalXp: 250,
    badges: [
      badge("first-challenge", 1000),
      badge("streak-7", 2000),
    ],
    gameHistory: [session("flamingo-balance", 2000, 60)],
    coins: 70,
  };

  const { profile } = mergeProfiles(server, client, 1000, 3000);
  const badges = profile.badges as { id: string }[];
  assert.equal(badges.length, 2);
  assert.equal(profile.totalXp, 250);
  assert.equal(profile.coins, 100);
  assert.equal((profile.gameHistory as unknown[]).length, 2);
});

test("Conflict: newer client wins XP max without duplicate sessions", () => {
  const server: Profile = {
    ...baseProfile(1),
    totalXp: 500,
    gameHistory: [session("freeze-statue", 5000, 30)],
  };
  const client: Profile = {
    ...baseProfile(1),
    totalXp: 480,
    gameHistory: [
      session("freeze-statue", 5000, 30),
      session("finger-stability", 6000, 45),
    ],
  };
  const { profile } = mergeProfiles(server, client, 4000, 7000);
  assert.equal(profile.totalXp, 500);
  assert.equal((profile.gameHistory as unknown[]).length, 2);
});

test("Spend coins on Device A preserved as max on merge", () => {
  const server: Profile = { ...baseProfile(1), coins: 100 };
  const client: Profile = { ...baseProfile(1), coins: 45 };
  const { profile } = mergeProfiles(server, client, 1000, 2000);
  assert.equal(profile.coins, 100);
});

test("Reinstall simulation: empty local + server profile restores fully", () => {
  const server: Profile = {
    ...baseProfile(1),
    totalXp: 1200,
    coins: 55,
    streakDays: 12,
    badges: [badge("flamingo-king", 9000)],
    gameHistory: [session("flamingo-balance", 9000, 80)],
    completedQuests: ["weekly-challenge"],
  };
  const freshLocal = baseProfile(1);
  const { profile, winner } = mergeProfiles(server, freshLocal, 5000, 1000);
  assert.equal(winner, "server");
  assert.equal(profile.totalXp, 1200);
  assert.equal(profile.streakDays, 12);
});

test("No duplicate XP from replayed identical session timestamp", () => {
  const s = session("breath-control", 7777, 50);
  const server: Profile = { ...baseProfile(1), totalXp: 100, gameHistory: [s] };
  const client: Profile = { ...baseProfile(1), totalXp: 150, gameHistory: [s] };
  const { profile } = mergeProfiles(server, client, 1000, 2000);
  assert.equal((profile.gameHistory as unknown[]).length, 1);
  assert.equal(profile.totalXp, 150);
});
