import type { Animal, QuizAnswerResult, QuizQuestion } from "./types.js";
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

export type QuizEngineOptions = {
  optionCount?: number;
  recentQuestionIds?: string[];
};

export function buildQuizQuestion(
  animals: Animal[],
  opts: QuizEngineOptions = {},
): QuizQuestion | null {
  if (animals.length < 3) return null;

  const optionCount = Math.min(Math.max(opts.optionCount ?? 3, 3), 4);
  const eligible = animals.filter((animal) => getPrimaryQuizSound(animal));
  if (eligible.length < optionCount) return null;

  const recent = new Set(opts.recentQuestionIds ?? []);
  const freshPool = eligible.filter((animal) => !recent.has(`quiz:${animal.id}`));
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
    id: `quiz:${correct.id}:${Date.now()}`,
    prompt: `Which animal says ${correct.quizPrompt}?`,
    correctAnimalId: correct.id,
    options,
    soundLabel: primarySound.label,
  };
}

export function gradeQuizAnswer(
  question: QuizQuestion,
  selectedAnimalId: string,
): QuizAnswerResult {
  return {
    correct: selectedAnimalId === question.correctAnimalId,
    questionId: question.id,
    selectedAnimalId,
    correctAnimalId: question.correctAnimalId,
  };
}

export function buildDiscoverySequence(
  animals: Animal[],
  count = 20,
): Animal[] {
  if (animals.length === 0) return [];
  const sequence: Animal[] = [];
  while (sequence.length < count) {
    sequence.push(...shuffle(animals));
  }
  return sequence.slice(0, count);
}
