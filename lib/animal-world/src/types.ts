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

export type Animal = {
  id: string;
  name: string;
  category: AnimalCategory;
  emoji: string;
  /** GCS object path for hero illustration */
  imageGcsPath: string;
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

export type AnimalWorldMode = "explore" | "toddler" | "quiz" | "discovery" | "parent";

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
