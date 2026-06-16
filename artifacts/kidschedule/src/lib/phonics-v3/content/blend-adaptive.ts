/**
 * Blend adaptive learning — integrated with daily mission selector.
 */
import type { PhonicsMasteryState } from "../mastery-engine";
import type { PhonicsRetentionState } from "../spaced-repetition";
import { getOverdueWordIds } from "../spaced-repetition";
import { getBlendWordBank, isBlendPathwayAvailable } from "./blend-catalog";
import type { CurriculumLevel } from "@workspace/phonics-curriculum";

export type BlendAdaptivePick = {
  word: string;
  blend: string;
  reason: "overdue" | "weak" | "new_blend";
};

export function selectBlendAdaptiveLessons(opts: {
  childId: number;
  dateKey: string;
  masteryAvg: number;
  mastery: PhonicsMasteryState;
  retention?: PhonicsRetentionState;
  maxPicks?: number;
  now?: number;
  currentLevel?: number;
}): BlendAdaptivePick[] {
  const level = (opts.currentLevel ?? 1) as CurriculumLevel;
  if (!isBlendPathwayAvailable(opts.masteryAvg, level)) return [];

  const bank = getBlendWordBank();
  const seed = opts.childId + opts.dateKey.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const now = opts.now ?? Date.now();
  const overdue = opts.retention ? getOverdueWordIds(opts.retention, now) : [];
  const picks: BlendAdaptivePick[] = [];
  const max = opts.maxPicks ?? 2;

  for (const entry of bank) {
    if (picks.length >= max) break;
    if (overdue.includes(entry.word)) {
      picks.push({ word: entry.word, blend: entry.blend, reason: "overdue" });
    }
  }

  for (const entry of bank) {
    if (picks.length >= max) break;
    const rec = opts.mastery.words[entry.word];
    if ((!rec || rec.score < 60) && !picks.some((p) => p.word === entry.word)) {
      picks.push({ word: entry.word, blend: entry.blend, reason: "weak" });
    }
  }

  if (picks.length < max) {
    const idx = Math.abs(seed) % bank.length;
    const entry = bank[idx]!;
    if (!picks.some((p) => p.word === entry.word)) {
      picks.push({ word: entry.word, blend: entry.blend, reason: "new_blend" });
    }
  }

  return picks.slice(0, max);
}
