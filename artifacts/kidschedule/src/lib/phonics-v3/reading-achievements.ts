/**
 * Meaningful reading milestones — celebrate progress, not streak pressure.
 */
export type ReadingAchievementId =
  | "first_word"
  | "first_sentence"
  | "first_story"
  | "stories_10"
  | "words_100"
  | "words_500"
  | "reading_champion"
  | "fluent_reader";

export type ReadingAchievement = {
  id: ReadingAchievementId;
  title: string;
  description: string;
  emoji: string;
};

export const READING_ACHIEVEMENTS: readonly ReadingAchievement[] = [
  {
    id: "first_word",
    title: "First Word",
    description: "You read your first word aloud!",
    emoji: "🌱",
  },
  {
    id: "first_sentence",
    title: "First Sentence",
    description: "You read a whole sentence.",
    emoji: "✏️",
  },
  {
    id: "first_story",
    title: "First Story",
    description: "You finished your first book.",
    emoji: "📘",
  },
  {
    id: "stories_10",
    title: "10 Stories",
    description: "Ten books completed — amazing!",
    emoji: "📚",
  },
  {
    id: "words_100",
    title: "100 Words Read",
    description: "One hundred words on your reading journey.",
    emoji: "💯",
  },
  {
    id: "words_500",
    title: "500 Words Read",
    description: "Five hundred words — you're a reading star.",
    emoji: "⭐",
  },
  {
    id: "reading_champion",
    title: "Reading Champion",
    description: "Stories, words, and steady practice.",
    emoji: "🏆",
  },
  {
    id: "fluent_reader",
    title: "Fluent Reader",
    description: "You're reading more smoothly every week.",
    emoji: "🌟",
  },
] as const;

export type AchievementState = {
  version: 1;
  unlocked: ReadingAchievementId[];
  unlockedAt: Record<string, number>;
};

const STORAGE_PREFIX = "amynest:phonics-academy-achievements:";

export function defaultAchievementState(): AchievementState {
  return { version: 1, unlocked: [], unlockedAt: {} };
}

export function loadAchievementState(childId: number): AchievementState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultAchievementState();
    return { ...defaultAchievementState(), ...JSON.parse(raw) };
  } catch {
    return defaultAchievementState();
  }
}

export function saveAchievementState(childId: number, state: AchievementState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function evaluateAchievements(opts: {
  state: AchievementState;
  wordsRead: number;
  storiesCompleted: number;
  sentencesRead?: number;
  fluencyBand?: string;
}): { state: AchievementState; newlyUnlocked: ReadingAchievement[] } {
  const have = new Set(opts.state.unlocked);
  const newly: ReadingAchievement[] = [];
  const unlock = (id: ReadingAchievementId) => {
    if (have.has(id)) return;
    have.add(id);
    newly.push(READING_ACHIEVEMENTS.find((a) => a.id === id)!);
  };

  if (opts.wordsRead >= 1) unlock("first_word");
  if ((opts.sentencesRead ?? 0) >= 1 || opts.storiesCompleted >= 1) unlock("first_sentence");
  if (opts.storiesCompleted >= 1) unlock("first_story");
  if (opts.storiesCompleted >= 10) unlock("stories_10");
  if (opts.wordsRead >= 100) unlock("words_100");
  if (opts.wordsRead >= 500) unlock("words_500");
  if (opts.storiesCompleted >= 5 && opts.wordsRead >= 50) unlock("reading_champion");
  if (opts.fluencyBand === "fluent" || opts.fluencyBand === "advanced") {
    unlock("fluent_reader");
  }

  if (newly.length === 0) return { state: opts.state, newlyUnlocked: [] };

  const unlockedAt = { ...opts.state.unlockedAt };
  const now = Date.now();
  for (const a of newly) unlockedAt[a.id] = now;

  return {
    state: {
      version: 1,
      unlocked: [...have] as ReadingAchievementId[],
      unlockedAt,
    },
    newlyUnlocked: newly,
  };
}
