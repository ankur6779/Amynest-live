import type { Animal, HearFindAnswerResult, HearFindQuestion } from "./types.js";
import { getPrimaryQuizSound } from "./catalog.js";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickDistinctAnimals(pool: Animal[], count: number, excludeId?: string): Animal[] {
  const filtered = pool.filter((animal) => animal.id !== excludeId);
  return shuffle(filtered).slice(0, count);
}

export type HearFindEngineOptions = {
  optionCount?: number;
  recentQuestionIds?: string[];
};

/** Hear-and-Find: play sound label, pick matching animal card (3–4 options). */
export function buildHearFindQuestion(
  animals: Animal[],
  opts: HearFindEngineOptions = {},
): HearFindQuestion | null {
  if (animals.length < 3) return null;

  const optionCount = Math.min(Math.max(opts.optionCount ?? 4, 3), 4);
  const eligible = animals.filter((animal) => getPrimaryQuizSound(animal));
  if (eligible.length < optionCount) return null;

  const recent = new Set(opts.recentQuestionIds ?? []);
  const freshPool = eligible.filter((animal) => !recent.has(`hear:${animal.id}`));
  const pool = freshPool.length >= optionCount ? freshPool : eligible;

  const correct = pool[Math.floor(Math.random() * pool.length)];
  const primarySound = getPrimaryQuizSound(correct);
  if (!primarySound) return null;

  const distractors = pickDistinctAnimals(eligible, optionCount - 1, correct.id);
  const options = shuffle([
    { animalId: correct.id, emoji: correct.emoji },
    ...distractors.map((animal) => ({ animalId: animal.id, emoji: animal.emoji })),
  ]);

  return {
    id: `hear:${correct.id}:${Date.now()}`,
    prompt: correct.quizPrompt,
    correctAnimalId: correct.id,
    options,
    soundLabel: primarySound.label,
  };
}

export function gradeHearFindAnswer(
  question: HearFindQuestion,
  selectedAnimalId: string,
): HearFindAnswerResult {
  return {
    correct: selectedAnimalId === question.correctAnimalId,
    questionId: question.id,
    selectedAnimalId,
    correctAnimalId: question.correctAnimalId,
  };
}

export function hearFindAccuracyPct(correct: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.round((correct / attempts) * 100);
}
