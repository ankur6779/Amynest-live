import type { WorldManifestItem } from "./manifest-types.js";

export type HearFindOption = { itemId: string; emoji: string };

export type HearFindQuestion = {
  id: string;
  prompt: string;
  correctItemId: string;
  options: HearFindOption[];
  soundLabel: string;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getPrimarySound(item: WorldManifestItem) {
  return item.sounds.find((s) => s.id === item.quizSoundId) ?? item.sounds[0];
}

export function buildPlatformHearFindQuestion(
  items: WorldManifestItem[],
  opts: { optionCount?: number; recentQuestionIds?: string[] } = {},
): HearFindQuestion | null {
  if (items.length < 3) return null;
  const optionCount = Math.min(Math.max(opts.optionCount ?? 4, 3), 4);
  const eligible = items.filter((item) => getPrimarySound(item));
  if (eligible.length < optionCount) return null;

  const recent = new Set(opts.recentQuestionIds ?? []);
  const fresh = eligible.filter((item) => !recent.has(`hear:${item.id}`));
  const pool = fresh.length >= optionCount ? fresh : eligible;
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const sound = getPrimarySound(correct);
  if (!sound) return null;

  const distractors = shuffle(eligible.filter((i) => i.id !== correct.id)).slice(
    0,
    optionCount - 1,
  );
  const options = shuffle([
    { itemId: correct.id, emoji: correct.emoji },
    ...distractors.map((i) => ({ itemId: i.id, emoji: i.emoji })),
  ]);

  return {
    id: `hear:${correct.id}:${Date.now()}`,
    prompt: correct.quizPrompt,
    correctItemId: correct.id,
    options,
    soundLabel: sound.label,
  };
}

export function gradePlatformHearFind(
  question: HearFindQuestion,
  selectedItemId: string,
): { correct: boolean; questionId: string; selectedItemId: string; correctItemId: string } {
  return {
    correct: selectedItemId === question.correctItemId,
    questionId: question.id,
    selectedItemId,
    correctItemId: question.correctItemId,
  };
}
