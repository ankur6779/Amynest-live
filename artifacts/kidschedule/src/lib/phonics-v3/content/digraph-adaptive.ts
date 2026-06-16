/**
 * Digraph adaptive learning — missions integrated with daily selector.
 */
import type { DailyMissionTask } from "@/lib/phonics-v2/daily-missions";
import type { PhonicsMasteryState } from "../mastery-engine";
import type { PhonicsRetentionState } from "../spaced-repetition";
import { getOverdueWordIds, skillTrackKey, isReviewDue } from "../spaced-repetition";
import {
  getDigraphMission,
  getDigraphWordBank,
  type DigraphMission,
} from "./digraph-catalog";
import type { DigraphId } from "./digraph-catalog";
import { DIGRAPH_PATHWAY, getUnlockedDigraphs, isDigraphPathwayAvailable } from "./digraph-pathway";

export type DigraphAdaptivePick = {
  digraphId: DigraphId;
  word: string;
  reason: "overdue" | "weak" | "new_digraph";
  missionId: string;
};

function hashPick(seed: number, len: number): number {
  return Math.abs(seed) % Math.max(1, len);
}

export function selectDigraphAdaptiveLessons(opts: {
  childId: number;
  dateKey: string;
  masteryAvg: number;
  mastery: PhonicsMasteryState;
  retention?: PhonicsRetentionState;
  maxPicks?: number;
  now?: number;
  currentLevel?: number;
}): DigraphAdaptivePick[] {
  const level = (opts.currentLevel ?? 1) as import("@workspace/phonics-curriculum").CurriculumLevel;
  if (!isDigraphPathwayAvailable(opts.masteryAvg, level)) return [];

  const unlocked = getUnlockedDigraphs(opts.masteryAvg, level);
  if (unlocked.length === 0) return [];

  const seed = opts.childId + opts.dateKey.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const now = opts.now ?? Date.now();
  const overdue = opts.retention ? getOverdueWordIds(opts.retention, now) : [];
  const picks: DigraphAdaptivePick[] = [];
  const max = opts.maxPicks ?? 2;

  for (const digraphId of unlocked.map((d) => d.id)) {
    const bank = getDigraphWordBank(digraphId);
    const mission = getDigraphMission(digraphId);
    const overdueWord = bank.find((w) => overdue.includes(w.word));
    if (overdueWord && picks.length < max) {
      picks.push({
        digraphId,
        word: overdueWord.word,
        reason: "overdue",
        missionId: mission.id,
      });
    }
  }

  for (const stage of unlocked) {
    if (picks.length >= max) break;
    const weak = stage.words.find((w) => {
      const rec = opts.mastery.words[w.word];
      return !rec || rec.score < 60;
    });
    const word = weak?.word ?? stage.words[0]?.word;
    if (!word) continue;
    if (picks.some((p) => p.word === word)) continue;
    picks.push({
      digraphId: stage.id,
      word,
      reason: "weak",
      missionId: getDigraphMission(stage.id).id,
    });
  }

  const locked = DIGRAPH_PATHWAY.filter(
    (d) => !unlocked.some((u) => u.id === d.id),
  );
  if (picks.length < max && locked.length > 0) {
    const next = locked[hashPick(seed, locked.length)]!;
    const word = next.words[0]?.word;
    if (word) {
      picks.push({
        digraphId: next.id,
        word,
        reason: "new_digraph",
        missionId: getDigraphMission(next.id).id,
      });
    }
  }

  return picks.slice(0, max);
}

export function buildDigraphMissionTasks(
  digraphId: DigraphId,
  opts?: { overdueWord?: string },
): DailyMissionTask[] {
  const mission: DigraphMission = getDigraphMission(digraphId);
  const overdue = opts?.overdueWord;

  return mission.tasks.map((t) => ({
    slot: t.slot === "story" ? "story" : t.slot === "assessment" ? "challenge" : "practice",
    id: t.id,
    emoji: t.emoji,
    label: overdue && t.slot === "practice" ? `Overdue ${digraphId}: ${overdue}` : t.label,
    word: overdue && t.slot === "practice" ? overdue : t.word,
    storyId: t.slot === "story" ? `dig-${digraphId}-01` : undefined,
    completed: false,
  }));
}

export function getDigraphRetentionOverdue(
  digraphId: DigraphId,
  retention: PhonicsRetentionState,
  now = Date.now(),
): string[] {
  const bank = getDigraphWordBank(digraphId);
  const phonemeKey = skillTrackKey("phoneme", digraphId);
  const phonemeDue = retention.tracks[phonemeKey] && isReviewDue(retention.tracks[phonemeKey]!, now);

  const overdueWords = bank
    .filter((w) => {
      const track = retention.tracks[skillTrackKey("word", w.word)];
      return track && isReviewDue(track, now);
    })
    .map((w) => w.word);

  if (phonemeDue) overdueWords.unshift(digraphId);
  return overdueWords;
}
