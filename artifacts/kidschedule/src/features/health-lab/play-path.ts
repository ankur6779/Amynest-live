/**
 * Play-first path helpers — UI/UX only.
 * Mirrors existing quest pick logic (first unplayed playable game); does not alter scoring/rewards.
 */
import { GAMES } from "./constants";
import { getWeeklyChallenge } from "./retention";
import { dateKeyLocal } from "./storage";
import { getAmyWorldStoryLine, getWorldEvolution } from "./world-evolution";
import { getWorldIdentity, pickWorldLine } from "./world-identity";
import type { HealthGameId, HealthLabPersistedState } from "./types";

export const PLAYABLE_GAMES = GAMES.filter((g) => g.id !== "calmness-meter");

export const MOTION_GAME_IDS: readonly HealthGameId[] = ["flamingo-balance", "freeze-statue"];

export function isMotionGame(gameId: HealthGameId): boolean {
  return MOTION_GAME_IDS.includes(gameId);
}

/** Same selection rule as HealthLabZone quest start (playables only, then first game). */
export function pickNextPlayableGame(state: HealthLabPersistedState): HealthGameId {
  const unplayed = PLAYABLE_GAMES.find((g) => !state.gamesCompletedToday.includes(g.id));
  return unplayed?.id ?? PLAYABLE_GAMES[0]?.id ?? GAMES[0].id;
}

export function getGameDef(gameId: HealthGameId) {
  return GAMES.find((g) => g.id === gameId) ?? GAMES[0];
}

export type AdventureBadge = "recommended" | "new" | "daily" | "completed" | null;

export function getAdventureBadge(
  gameId: HealthGameId,
  state: HealthLabPersistedState,
  recommendedId: HealthGameId,
): AdventureBadge {
  if (gameId === recommendedId && !state.gamesCompletedToday.includes(gameId)) {
    return "recommended";
  }
  if (state.gamesCompletedToday.includes(gameId)) return "completed";
  const weekly = getWeeklyChallenge();
  if (weekly.gameId === gameId) return "daily";
  const playedBefore = state.gameHistory.some((s) => s.gameId === gameId);
  if (!playedBefore) return "new";
  return null;
}

export function todaysAdventureIds(
  state: HealthLabPersistedState,
  recommendedId: HealthGameId,
  limit = 3,
): HealthGameId[] {
  const ordered = [
    recommendedId,
    ...PLAYABLE_GAMES.map((g) => g.id).filter((id) => id !== recommendedId),
  ];
  const unique = [...new Set(ordered)].filter((id) => id !== "calmness-meter");
  return unique.slice(0, limit);
}

function yesterdayKey(): string {
  return dateKeyLocal(new Date(Date.now() - 86400000));
}

function worldPlayedYesterday(state: HealthLabPersistedState, gameId: HealthGameId): boolean {
  const y = yesterdayKey();
  return state.gameHistory.some(
    (s) => s.gameId === gameId && dateKeyLocal(new Date(s.timestamp)) === y,
  );
}

function bestWorldYesterday(state: HealthLabPersistedState): HealthGameId | null {
  const y = yesterdayKey();
  const yesterday = state.gameHistory.filter(
    (s) => s.gameId !== "calmness-meter" && dateKeyLocal(new Date(s.timestamp)) === y,
  );
  if (yesterday.length === 0) return null;
  return yesterday.reduce((best, s) => (s.score >= best.score ? s : best), yesterday[0]).gameId;
}

function coachingSeed(state: HealthLabPersistedState, nextGameId: HealthGameId): number {
  const day = dateKeyLocal();
  let h = state.totalSessions * 17 + state.streakDays * 3 + completedCount(state) * 11;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  for (let i = 0; i < nextGameId.length; i++) h = (h * 17 + nextGameId.charCodeAt(i)) | 0;
  return h;
}

function completedCount(state: HealthLabPersistedState): number {
  return state.gamesCompletedToday.filter((id) => id !== "calmness-meter").length;
}

/**
 * Contextual Amy coaching from local progress only (no backend / reward changes).
 * Rotates lines so messages feel alive, not scripted-on-loop.
 */
export function getMissionCoaching(
  state: HealthLabPersistedState,
  childName: string,
  nextGameId: HealthGameId,
): { greeting: string; missionLine: string; amyLine: string } {
  const world = getWorldIdentity(nextGameId);
  const today = dateKeyLocal();
  const yesterday = yesterdayKey();
  const completed = completedCount(state);
  const remaining = Math.max(0, PLAYABLE_GAMES.length - completed);
  const seed = coachingSeed(state, nextGameId);
  const greetPool =
    state.totalSessions === 0
      ? [`Hi ${childName}!`, `Welcome, ${childName}!`, `Hello explorer ${childName}!`]
      : [`Hi ${childName}!`, `Welcome back, ${childName}!`, `${childName} — adventure time!`];
  const greeting = pickWorldLine(greetPool, seed);
  const missionLine = pickWorldLine(world.greetings, seed + 1);

  const firstEver = state.totalSessions === 0;
  const freshDay =
    completed === 0 &&
    state.lastPlayDateKey !== today &&
    state.totalSessions > 0;
  const missedGap =
    Boolean(state.lastPlayDateKey) &&
    state.lastPlayDateKey !== today &&
    state.lastPlayDateKey !== yesterday &&
    completed === 0;
  const yBest = bestWorldYesterday(state);
  const pb = state.personalBests[nextGameId];

  const pool: string[] = [];
  const evo = getWorldEvolution(state, nextGameId);
  const worldStory = getAmyWorldStoryLine(state, nextGameId);

  // Prefer concrete world memories over generic praise (presentation only).
  if (worldStory) {
    pool.push(worldStory);
  }
  if (evo.helpedYesterday) {
    pool.push(`Yesterday you restored ${world.worldName}. It still remembers.`);
  }
  if (evo.helpedToday && evo.stage >= 2) {
    pool.push(
      `I can still see what you did in ${world.worldName} — ${evo.milestoneLabel}!`,
      `${world.worldName} is still celebrating because of you!`,
    );
  }
  if (evo.lifetimeSessions > 0 && !evo.helpedToday) {
    pool.push(
      `The friends in ${world.worldName} keep talking about you.`,
      `${world.worldName} is ${evo.milestoneLabel.toLowerCase()} thanks to you.`,
    );
  }

  if (firstEver) {
    pool.push(
      `Welcome to the lab! Let's visit ${world.worldName} together.`,
      `Your first adventure starts in ${world.worldName}!`,
      pickWorldLine(world.greetings, seed + 2),
    );
  } else if (remaining === 0) {
    pool.push(
      "Every world explored — I'm so proud of you!",
      "What a full day of magic — high five!",
      "You did it all today. Rest those superpowers!",
    );
  } else if (missedGap) {
    pool.push(
      `I missed our adventure! Want to explore ${world.worldName}?`,
      `Welcome back — I saved ${world.worldName} for you!`,
      `I missed you! ${world.kidAction}`,
    );
  } else if (freshDay && yBest) {
    const yWorld = getWorldIdentity(yBest);
    const yEvo = getWorldEvolution(state, yBest);
    pool.push(
      `Yesterday you restored ${yWorld.worldName}. Today: ${world.worldName}?`,
      yEvo.stage >= 2
        ? `I still see ${yWorld.worldName} glowing — ${yEvo.milestoneLabel}!`
        : `I remember you loved ${yWorld.worldName} yesterday!`,
      `Fresh day! ${pickWorldLine(world.greetings, seed + 3)}`,
    );
  } else if (freshDay) {
    pool.push(
      `Welcome back! ${pickWorldLine(world.greetings, seed + 4)}`,
      `A brand-new day in ${world.worldName}!`,
      evo.stage === 0
        ? `${world.worldName} is waiting for your help.`
        : `${world.kidAction} Let's make today sparkle!`,
    );
  } else if (remaining === 1) {
    pool.push(
      `Only one world left today — finish at ${world.worldName}!`,
      `Almost done — ${world.worldName} is calling!`,
      `One adventure left. You've got this!`,
    );
  } else if (pb != null && pb > 0) {
    pool.push(
      `Let's help ${world.worldName} grow even happier!`,
      `Can you top your best in ${world.worldName}?`,
      `You've become much steadier — show ${world.worldName}!`,
    );
  } else if (state.streakDays >= 7) {
    pool.push(
      `${state.streakDays}-day streak! You're a wellness legend!`,
      `Streak magic — ${state.streakDays} days! ${world.kidAction}`,
    );
  } else if (state.streakDays >= 3) {
    pool.push(
      `${state.streakDays}-day streak! Keep the magic going.`,
      `Your streak is glowing — next stop ${world.worldName}!`,
    );
  } else if (completed === 0 && state.streakDays === 0 && state.totalSessions > 0) {
    pool.push(
      "No streak yet — one short play starts the spark!",
      `Let's light a new streak in ${world.worldName}!`,
      pickWorldLine(world.greetings, seed + 5),
    );
  } else {
    pool.push(
      pickWorldLine(world.greetings, seed + 6),
      evo.stage === 0
        ? `Help restore ${world.worldName}!`
        : `${world.kidAction} Let's go to ${world.worldName}!`,
      worldPlayedYesterday(state, nextGameId)
        ? `Back to ${world.worldName}? I believe in you!`
        : `Adventure time in ${world.worldName}!`,
    );
  }

  return { greeting, missionLine, amyLine: pickWorldLine(pool, seed + 9) };
}

/** Soft parent-facing one-liner from the same local state. */
export function getParentInsightLine(state: HealthLabPersistedState, childName: string): string {
  const week = state.gameHistory.filter(
    (s) => Date.now() - s.timestamp < 7 * 86400000 && s.gameId !== "calmness-meter",
  ).length;
  if (state.totalSessions === 0) {
    return `${childName} hasn't started a wellness adventure yet — one short play builds the habit.`;
  }
  if (week === 0) {
    return `${childName} was active before — a gentle invite back today helps the streak.`;
  }
  if (state.streakDays >= 3) {
    return `${childName} has a ${state.streakDays}-day streak with ${week} sessions this week. Consistency looks great.`;
  }
  return `${childName} completed ${week} session${week === 1 ? "" : "s"} this week. Keep play light and fun.`;
}
