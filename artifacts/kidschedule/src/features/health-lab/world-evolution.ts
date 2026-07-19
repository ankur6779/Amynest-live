/**
 * World Evolution — presentation only.
 * Derives visual/narrative stages from existing gameHistory + gamesCompletedToday.
 * Does NOT alter XP, rewards, quests, sync, or APIs.
 */
import { dateKeyLocal } from "./storage";
import { PLAYABLE_GAMES } from "./play-path";
import { getWorldIdentity } from "./world-identity";
import type { HealthGameId, HealthLabPersistedState } from "./types";

/** 0 = unrestored … 4 = fully alive / festival */
export type WorldStage = 0 | 1 | 2 | 3 | 4;

export interface WorldEvolutionSnapshot {
  gameId: HealthGameId;
  stage: WorldStage;
  lifetimeSessions: number;
  helpedToday: boolean;
  helpedYesterday: boolean;
  milestoneLabel: string;
  stageLabel: string;
  friendEmoji: string;
  memoryLine: string;
}

const FRIENDS: Record<Exclude<HealthGameId, "calmness-meter">, string> = {
  "breath-control": "🐦",
  "flamingo-balance": "☁️",
  "reaction-time": "🤖",
  "freeze-statue": "🦋",
  "finger-stability": "✨",
};

const MILESTONES: Record<Exclude<HealthGameId, "calmness-meter">, readonly string[]> = {
  "breath-control": [
    "Balloons are sleepy",
    "Colors returning",
    "Rainbow waking",
    "Birds visiting",
    "Balloon Valley is Happy",
  ],
  "flamingo-balance": [
    "Clouds unstable",
    "Island steadying",
    "Windmills turning",
    "Birds arriving",
    "Sky Island Safe Again",
  ],
  "reaction-time": [
    "Cold launch pad",
    "Lights activating",
    "Fuel tanks glowing",
    "Crews waving",
    "Rocket Base Fully Powered",
  ],
  "freeze-statue": [
    "Tiny buds",
    "Flowers blooming",
    "Butterflies visiting",
    "Golden petals",
    "Crystal Garden Blooming",
  ],
  "finger-stability": [
    "Dark cave",
    "Crystals waking",
    "Walls glowing",
    "Sparkles floating",
    "Crystal Cave Shining",
  ],
};

const STAGE_BEATS: Record<Exclude<HealthGameId, "calmness-meter">, readonly string[]> = {
  "breath-control": [
    "pale sky",
    "color returning",
    "rainbow rising",
    "birds singing",
    "festival banners",
  ],
  "flamingo-balance": [
    "wobbly clouds",
    "steady island",
    "spinning windmills",
    "sky birds",
    "floating festival",
  ],
  "reaction-time": [
    "cold pad",
    "pad lights on",
    "fuel glow",
    "crew wave",
    "countdown ready",
  ],
  "freeze-statue": [
    "small buds",
    "open blooms",
    "butterflies",
    "golden flowers",
    "garden party",
  ],
  "finger-stability": [
    "dim cave",
    "tiny glow",
    "lit walls",
    "floating sparks",
    "living cave",
  ],
};

function yesterdayKey(): string {
  return dateKeyLocal(new Date(Date.now() - 86400000));
}

export function countLifetimeSessions(
  state: HealthLabPersistedState,
  gameId: HealthGameId,
): number {
  return state.gameHistory.filter((s) => s.gameId === gameId).length;
}

export function stageFromSessionCount(n: number): WorldStage {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

export function getWorldEvolution(
  state: HealthLabPersistedState,
  gameId: HealthGameId,
): WorldEvolutionSnapshot {
  if (gameId === "calmness-meter") {
    return {
      gameId,
      stage: 0,
      lifetimeSessions: 0,
      helpedToday: false,
      helpedYesterday: false,
      milestoneLabel: "Adventure Journal",
      stageLabel: "memories",
      friendEmoji: "📖",
      memoryLine: "Your Journal keeps every adventure safe.",
    };
  }

  const lifetimeSessions = countLifetimeSessions(state, gameId);
  let stage = stageFromSessionCount(lifetimeSessions);
  const helpedToday = state.gamesCompletedToday.includes(gameId);
  const y = yesterdayKey();
  const helpedYesterday = state.gameHistory.some(
    (s) => s.gameId === gameId && dateKeyLocal(new Date(s.timestamp)) === y,
  );

  // Helping today nudges the land one visual notch (cap 4) — still derived, not stored.
  if (helpedToday && stage < 4) {
    stage = Math.min(4, stage + 1) as WorldStage;
  }

  const world = getWorldIdentity(gameId);
  const milestones = MILESTONES[gameId];
  const beats = STAGE_BEATS[gameId];
  const milestoneLabel = milestones[stage] ?? world.worldName;
  const stageLabel = beats[stage] ?? "";

  let memoryLine: string;
  if (helpedToday) {
    memoryLine =
      stage >= 4
        ? `${world.worldName} is still celebrating because of you!`
        : `Today you helped ${world.worldName} — ${milestoneLabel.toLowerCase()}.`;
  } else if (helpedYesterday) {
    memoryLine = `Yesterday you restored ${world.worldName}. It still remembers.`;
  } else if (lifetimeSessions > 0) {
    memoryLine = `${world.worldName} is ${milestoneLabel.toLowerCase()} thanks to you.`;
  } else {
    memoryLine = `${world.worldName} is waiting for your help.`;
  }

  return {
    gameId,
    stage,
    lifetimeSessions,
    helpedToday,
    helpedYesterday,
    milestoneLabel,
    stageLabel,
    friendEmoji: FRIENDS[gameId],
    memoryLine,
  };
}

export function getAllWorldEvolutions(state: HealthLabPersistedState): WorldEvolutionSnapshot[] {
  return PLAYABLE_GAMES.map((g) => getWorldEvolution(state, g.id));
}

/** 0–4 hub vitality from how many worlds the child has restored. */
export function getHubVitality(state: HealthLabPersistedState): WorldStage {
  const restored = PLAYABLE_GAMES.filter(
    (g) => countLifetimeSessions(state, g.id) > 0,
  ).length;
  if (restored <= 0) return 0;
  if (restored === 1) return 1;
  if (restored === 2) return 2;
  if (restored <= 4) return 3;
  return 4;
}

export function getHubMemoryLine(state: HealthLabPersistedState): string | null {
  const evolutions = getAllWorldEvolutions(state);
  const celebrating = evolutions.filter((e) => e.helpedToday);
  if (celebrating.length > 0) {
    const e = celebrating[celebrating.length - 1]!;
    return e.memoryLine;
  }
  const yesterday = evolutions.filter((e) => e.helpedYesterday);
  if (yesterday.length > 0) {
    return yesterday[0]!.memoryLine;
  }
  const alive = evolutions.filter((e) => e.lifetimeSessions > 0);
  if (alive.length === 0) return null;
  // Prefer highest stage world for pride
  const top = [...alive].sort((a, b) => b.stage - a.stage)[0]!;
  return top.memoryLine;
}

export function getAmyWorldStoryLine(
  state: HealthLabPersistedState,
  nextGameId: HealthGameId,
): string | null {
  const hub = getHubMemoryLine(state);
  const next = getWorldEvolution(state, nextGameId);
  const world = getWorldIdentity(nextGameId);

  if (next.helpedToday && next.stage >= 3) {
    return `I can still see what you did in ${world.worldName} — ${next.milestoneLabel}!`;
  }
  if (next.lifetimeSessions > 0 && !next.helpedToday) {
    return `The friends in ${world.worldName} keep talking about you.`;
  }
  if (hub && next.lifetimeSessions === 0) {
    return hub;
  }
  return hub;
}
