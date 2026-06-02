/** Animal World — toddler animal sounds module types. */

export const ANIMAL_CATEGORIES = [
  "farm",
  "wild",
  "sea",
  "birds",
  "insects",
  "pets",
  "jungle",
  "arctic",
] as const;

export type AnimalCategory = (typeof ANIMAL_CATEGORIES)[number];

export type AnimalSound = {
  id: string;
  label: string;
  /** GCS object path, e.g. animal-world/farm/cow/moo-01.mp3 */
  gcsPath: string;
  durationSec: number;
  /** 0–1 normalized waveform preview bars */
  waveform: number[];
};

export type AnimalNarration = {
  intro: string;
  introGcsPath: string;
  soundCue: string;
  soundCueGcsPath: string;
};

export type AnimalHeroVariant = "cartoon" | "real";

export type Animal = {
  id: string;
  name: string;
  category: AnimalCategory;
  emoji: string;
  /** GCS object path for hero illustration (cartoon default) */
  imageGcsPath: string;
  /** Optional real-photo hero; falls back to imageGcsPath */
  heroRealGcsPath?: string;
  /** Optional cartoon hero override; falls back to imageGcsPath */
  heroCartoonGcsPath?: string;
  funFact: string;
  sounds: AnimalSound[];
  narration: AnimalNarration;
  /** Primary sound id used for quiz ("Which animal says …?") */
  quizSoundId: string;
  quizPrompt: string;
};

export type AnimalWorldCatalog = {
  version: number;
  animals: Animal[];
};

export type AnimalWorldMode =
  | "explore"
  | "toddler"
  | "quiz"
  | "hear_find"
  | "discovery"
  | "achievements"
  | "stickers"
  | "parent";

/** Per-animal collection state shown on cards. */
export type AnimalCollectionStatus = "locked" | "discovered" | "unlocked" | "mastered";

export type ExplorerTier = "none" | "bronze" | "silver" | "gold";

export const EXPLORER_TIER_XP: Record<Exclude<ExplorerTier, "none">, number> = {
  bronze: 50,
  silver: 200,
  gold: 500,
};

export type AnimalMasteryRecord = {
  soundsPlayed: number;
  quizzesCorrect: number;
  hearFindCorrect: number;
  hearFindAttempts: number;
};

export type AnimalWorldProgressV2 = {
  xp: number;
  explorerTier: ExplorerTier;
  animalMastery: Record<string, AnimalMasteryRecord>;
  stickersEarned: string[];
  achievementsUnlocked: string[];
  hearFindSessions: number;
  hearFindCorrectTotal: number;
  hearFindAttemptTotal: number;
  quizCorrectTotal: number;
  discoverySessionsCompleted: number;
  weeklyMinutes: Record<string, number>;
  monthlyAnimalsOpened: Record<string, number>;
};

export type HearFindQuestion = {
  id: string;
  prompt: string;
  correctAnimalId: string;
  options: Array<{ animalId: string; emoji: string }>;
  soundLabel: string;
};

export type HearFindAnswerResult = {
  correct: boolean;
  questionId: string;
  selectedAnimalId: string;
  correctAnimalId: string;
};

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  metric: AchievementMetric;
};

export type AchievementMetric =
  | "unique_animals_heard"
  | "category_complete"
  | "quiz_correct_total"
  | "hear_find_accuracy_pct"
  | "discovery_sessions";

export type AchievementProgress = {
  definition: AchievementDefinition;
  current: number;
  unlocked: boolean;
};

export type StickerDefinition = {
  id: string;
  animalId: string;
  title: string;
  emoji: string;
  unlockRule: StickerUnlockRule;
};

export type StickerUnlockRule =
  | { type: "sounds_played"; count: number }
  | { type: "quiz_correct"; count: number }
  | { type: "discovery_complete" };

export type ParentInsightsSnapshot = {
  mostPlayed: Array<{ animalId: string; count: number }>;
  mostRecognized: Array<{ animalId: string; accuracy: number }>;
  quizAccuracyPct: number;
  hearFindAccuracyPct: number;
  favoriteCategories: Array<{ category: AnimalCategory; count: number }>;
  weeklyProgress: Array<{ weekKey: string; minutes: number }>;
  monthlyProgress: Array<{ monthKey: string; animalsOpened: number }>;
  streakDays: number;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  correctAnimalId: string;
  options: Array<{ animalId: string; emoji: string }>;
  soundLabel: string;
};

export type QuizAnswerResult = {
  correct: boolean;
  questionId: string;
  selectedAnimalId: string;
  correctAnimalId: string;
};

export type AnimalWorldSessionStats = {
  childId: number;
  playCounts: Record<string, number>;
  soundCounts: Record<string, number>;
  favorites: string[];
  streakDays: number;
  lastPlayedDate: string | null;
  sessionStartedAt: number;
  totalSessionMs: number;
};
