/**
 * Optional reading companion pet — grows with genuine literacy practice.
 * Free progression only (no IAP). Presentation layer on top of existing counters.
 */

export type ReadingPetKind = "owl" | "fox" | "panda" | "dino" | "dragon";

export type ReadingPetState = {
  version: 1;
  kind: ReadingPetKind;
  /** 0–100 growth meter */
  growth: number;
  lessonsCompleted: number;
  wordsRead: number;
  storiesFinished: number;
  pronunciationPractices: number;
  lastFedAt: number;
};

export const READING_PETS: Record<
  ReadingPetKind,
  { emoji: string; name: string; babyEmoji: string }
> = {
  owl: { emoji: "🦉", babyEmoji: "🥚", name: "Pip the Owl" },
  fox: { emoji: "🦊", babyEmoji: "🧡", name: "Fizz the Fox" },
  panda: { emoji: "🐼", babyEmoji: "🎋", name: "Bao the Panda" },
  dino: { emoji: "🦕", babyEmoji: "🦖", name: "Dot the Dino" },
  dragon: { emoji: "🐉", babyEmoji: "✨", name: "Spark the Dragon" },
};

const STORAGE_PREFIX = "amynest:phonics-reading-pet:";

export function defaultReadingPetState(kind: ReadingPetKind = "owl"): ReadingPetState {
  return {
    version: 1,
    kind,
    growth: 0,
    lessonsCompleted: 0,
    wordsRead: 0,
    storiesFinished: 0,
    pronunciationPractices: 0,
    lastFedAt: 0,
  };
}

export function loadReadingPetState(childId: number): ReadingPetState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultReadingPetState();
    return { ...defaultReadingPetState(), ...JSON.parse(raw) };
  } catch {
    return defaultReadingPetState();
  }
}

export function saveReadingPetState(childId: number, state: ReadingPetState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function setReadingPetKind(
  state: ReadingPetState,
  kind: ReadingPetKind,
): ReadingPetState {
  return { ...state, kind };
}

function recomputeGrowth(state: ReadingPetState): number {
  const raw =
    state.lessonsCompleted * 8 +
    state.wordsRead * 0.4 +
    state.storiesFinished * 10 +
    state.pronunciationPractices * 3;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function feedReadingPet(
  state: ReadingPetState,
  event: {
    lesson?: boolean;
    words?: number;
    story?: boolean;
    pronunciation?: boolean;
  },
): ReadingPetState {
  const next: ReadingPetState = {
    ...state,
    lessonsCompleted: state.lessonsCompleted + (event.lesson ? 1 : 0),
    wordsRead: state.wordsRead + Math.max(0, event.words ?? 0),
    storiesFinished: state.storiesFinished + (event.story ? 1 : 0),
    pronunciationPractices:
      state.pronunciationPractices + (event.pronunciation ? 1 : 0),
    lastFedAt: Date.now(),
  };
  next.growth = recomputeGrowth(next);
  return next;
}

export function petStage(growth: number): "egg" | "hatchling" | "growing" | "strong" {
  if (growth < 15) return "egg";
  if (growth < 40) return "hatchling";
  if (growth < 75) return "growing";
  return "strong";
}

export function petDisplayEmoji(state: ReadingPetState): string {
  const meta = READING_PETS[state.kind];
  const stage = petStage(state.growth);
  if (stage === "egg") return meta.babyEmoji;
  return meta.emoji;
}

export function petEncouragement(state: ReadingPetState): string {
  const name = READING_PETS[state.kind].name.split(" ")[0]!;
  const stage = petStage(state.growth);
  if (stage === "egg") return `${name} is waiting — finish a lesson to hatch!`;
  if (stage === "hatchling") return `${name} is growing — keep reading!`;
  if (stage === "growing") return `${name} feels proud of you!`;
  return `${name} is strong — you are a reading champion!`;
}
