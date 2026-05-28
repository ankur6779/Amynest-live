import type { SpeechGameId } from "@workspace/speech-coach";

export interface SpeechGameTheme {
  emoji: string;
  cardClass: string;
  accentClass: string;
  wordEmoji: Record<string, string>;
}

export const SPEECH_GAME_THEMES: Record<SpeechGameId, SpeechGameTheme> = {
  animal_sounds: {
    emoji: "🦁",
    cardClass:
      "border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30",
    accentClass: "from-amber-400 to-orange-500",
    wordEmoji: {
      cat: "🐱",
      dog: "🐶",
      bird: "🐦",
      fish: "🐟",
      frog: "🐸",
      ball: "⚽",
      cow: "🐮",
      lion: "🦁",
    },
  },
  rhyming: {
    emoji: "🎵",
    cardClass:
      "border-violet-300/60 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/30",
    accentClass: "from-violet-400 to-fuchsia-500",
    wordEmoji: {
      cat: "🐱",
      hat: "🎩",
      bat: "🦇",
      dog: "🐶",
      log: "🪵",
      sun: "☀️",
      fun: "🎉",
    },
  },
  tongue_exercises: {
    emoji: "👅",
    cardClass:
      "border-rose-300/60 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/30",
    accentClass: "from-rose-400 to-pink-500",
    wordEmoji: {},
  },
  breathing: {
    emoji: "🫧",
    cardClass:
      "border-cyan-300/60 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/40 dark:to-sky-950/30",
    accentClass: "from-cyan-400 to-sky-500",
    wordEmoji: {},
  },
  slow_vs_fast: {
    emoji: "⏱️",
    cardClass:
      "border-indigo-300/60 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30",
    accentClass: "from-indigo-400 to-blue-500",
    wordEmoji: {},
  },
  emotion_express: {
    emoji: "😊",
    cardClass:
      "border-emerald-300/60 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30",
    accentClass: "from-emerald-400 to-teal-500",
    wordEmoji: {
      happy: "😊",
      help: "🆘",
      play: "🎮",
      open: "🚪",
      sad: "😢",
      surprised: "😲",
    },
  },
};

export function emojiForGameWord(
  gameId: SpeechGameId,
  word: string,
): string | null {
  const theme = SPEECH_GAME_THEMES[gameId];
  const key = word.trim().toLowerCase();
  return theme.wordEmoji[key] ?? null;
}
