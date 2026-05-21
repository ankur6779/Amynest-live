import type { CurriculumLevel } from "./types.js";
import { clampCurriculumLevel } from "./levels.js";

export interface WeeklyMixInput {
  count: number;
  currentLevel: CurriculumLevel;
  weakPhonemes: string[];
  seed: number;
}

export interface WeeklyMixSlot {
  /** "current" | "previous" | "weak" */
  bucket: "current" | "previous" | "weak";
  level: CurriculumLevel;
}

/**
 * Weekly test composition: 40% current, 30% previous, 30% weak-area focus.
 */
export function buildWeeklyTestMix(input: WeeklyMixInput): WeeklyMixSlot[] {
  const { count, currentLevel, seed } = input;
  const prev = clampCurriculumLevel(currentLevel - 1);
  const nCurrent = Math.round(count * 0.4);
  const nPrevious = Math.round(count * 0.3);
  const nWeak = count - nCurrent - nPrevious;

  const slots: WeeklyMixSlot[] = [];
  let s = seed >>> 0;
  const push = (bucket: WeeklyMixSlot["bucket"], level: CurriculumLevel, n: number) => {
    for (let i = 0; i < n; i++) {
      slots.push({ bucket, level });
      s = (s * 1664525 + 1013904223) >>> 0;
    }
  };
  push("current", currentLevel, nCurrent);
  push("previous", prev, nPrevious);
  push("weak", currentLevel, nWeak);

  return shuffle(slots, seed);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
