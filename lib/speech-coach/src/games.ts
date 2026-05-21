// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — playable game session configs (English, global)
// ─────────────────────────────────────────────────────────────────────────────

import { PRONUNCIATION_PROMPTS } from "./content";
import { buildAdaptivePromptSession, seededShuffle } from "./adaptive";
import { monthsToBand } from "./helpers";
import type {
  PronouncePrompt,
  PronouncePromptDifficulty,
  PronouncePromptKind,
  SpeechGameId,
} from "./types";
import type { PromptScoreHistory } from "./adaptive";

export interface SpeechGameSessionConfig {
  gameId: SpeechGameId;
  kinds: readonly PronouncePromptKind[];
  difficulties: readonly PronouncePromptDifficulty[];
  sessionSize: number;
}

export const SPEECH_GAME_SESSIONS: Readonly<
  Record<SpeechGameId, SpeechGameSessionConfig>
> = {
  animal_sounds: {
    gameId: "animal_sounds",
    kinds: ["word"],
    difficulties: ["easy"],
    sessionSize: 5,
  },
  rhyming: {
    gameId: "rhyming",
    kinds: ["word"],
    difficulties: ["easy", "medium"],
    sessionSize: 5,
  },
  tongue_exercises: {
    gameId: "tongue_exercises",
    kinds: ["phonic"],
    difficulties: ["medium", "advanced"],
    sessionSize: 5,
  },
  breathing: {
    gameId: "breathing",
    kinds: ["sentence"],
    difficulties: ["easy"],
    sessionSize: 4,
  },
  slow_vs_fast: {
    gameId: "slow_vs_fast",
    kinds: ["word", "sentence"],
    difficulties: ["easy", "medium"],
    sessionSize: 6,
  },
  emotion_express: {
    gameId: "emotion_express",
    kinds: ["word"],
    difficulties: ["medium"],
    sessionSize: 5,
  },
};

const ANIMAL_WORD_IDS = new Set([
  "W_cat",
  "W_dog",
  "W_bird",
  "W_fish",
  "W_frog",
  "W_ball",
]);

const EMOTION_WORD_IDS = new Set(["W_happy", "W_help", "W_play", "W_open"]);

/** Pool of prompts for a speech game, filtered by game theme. */
export function getGamePromptPool(
  gameId: SpeechGameId,
  ageMonths: number,
): readonly PronouncePrompt[] {
  const cfg = SPEECH_GAME_SESSIONS[gameId];
  const band = monthsToBand(ageMonths);
  const matchBand = band ?? "2y";

  let pool = PRONUNCIATION_PROMPTS.filter(
    (p) =>
      cfg.kinds.includes(p.kind) &&
      p.ageBands.includes(matchBand) &&
      cfg.difficulties.includes(p.difficulty ?? "easy"),
  );

  if (gameId === "animal_sounds") {
    const themed = pool.filter((p) => ANIMAL_WORD_IDS.has(p.id));
    if (themed.length >= 3) pool = themed;
  }
  if (gameId === "emotion_express") {
    const themed = pool.filter((p) => EMOTION_WORD_IDS.has(p.id));
    if (themed.length >= 2) pool = themed;
  }

  if (pool.length > 0) return pool;
  return PRONUNCIATION_PROMPTS.filter(
    (p) => p.kind === "word" && p.ageBands.includes(matchBand),
  ).slice(0, 8);
}

/** Build a shuffled game session (optionally adaptive from history). */
export function buildGamePromptSession(
  gameId: SpeechGameId,
  ageMonths: number,
  seed: number,
  history: readonly PromptScoreHistory[] = [],
): PronouncePrompt[] {
  const cfg = SPEECH_GAME_SESSIONS[gameId];
  const pool = getGamePromptPool(gameId, ageMonths);
  if (history.length > 0) {
    return buildAdaptivePromptSession(pool, history, cfg.sessionSize, seed);
  }
  return seededShuffle([...pool], seed).slice(
    0,
    Math.min(cfg.sessionSize, pool.length),
  );
}
