/**
 * Post-SATPIN-group reading assessment — evaluates readiness for the next group.
 * Does not mutate letter-group unlock itself; callers combine with progression.ts.
 */
import {
  getLetterGroup,
  getUnlockedGroupWords,
} from "@workspace/phonics-curriculum";
import {
  canUnlockNextLetterGroup,
  type ReadingSkillId,
} from "./reading-lesson-engine";
import type { ReadingSkillsState } from "./reading-skills";
import { skillScoresMap } from "./reading-skills";

export type GroupAssessmentItemKind =
  | "sound_id"
  | "letter_id"
  | "blend"
  | "segment"
  | "read_word"
  | "listen";

export type GroupAssessmentItem = {
  id: string;
  kind: GroupAssessmentItemKind;
  prompt: string;
  target: string;
  options?: string[];
};

export type GroupAssessmentResult = {
  letterGroupIndex: number;
  scorePct: number;
  byKind: Partial<Record<GroupAssessmentItemKind, number>>;
  skillScores: Partial<Record<ReadingSkillId, number>>;
  canAdvance: boolean;
  reason: string;
  items: GroupAssessmentItem[];
};

/** Build a short structured assessment for the current letter group. */
export function buildGroupAssessment(
  letterGroupIndex: number,
  seed = 1,
): GroupAssessmentItem[] {
  const group = getLetterGroup(letterGroupIndex);
  const words = getUnlockedGroupWords(letterGroupIndex);
  const grapheme = group.graphemes[seed % group.graphemes.length]!;
  const word = words[seed % Math.max(1, words.length)] ?? "sat";
  const distractor = words[(seed + 1) % Math.max(1, words.length)] ?? "pin";

  return [
    {
      id: `${letterGroupIndex}-sound`,
      kind: "sound_id",
      prompt: `What sound does ${grapheme.toUpperCase()} make?`,
      target: grapheme,
    },
    {
      id: `${letterGroupIndex}-letter`,
      kind: "letter_id",
      prompt: `Which letter makes /${grapheme}/?`,
      target: grapheme,
      options: [grapheme, group.graphemes[(seed + 1) % group.graphemes.length]!, "x"].slice(0, 3),
    },
    {
      id: `${letterGroupIndex}-blend`,
      kind: "blend",
      prompt: `Blend the sounds to read the word`,
      target: word,
    },
    {
      id: `${letterGroupIndex}-segment`,
      kind: "segment",
      prompt: `Break ${word} into sounds`,
      target: word,
    },
    {
      id: `${letterGroupIndex}-read`,
      kind: "read_word",
      prompt: `Read this word`,
      target: word,
    },
    {
      id: `${letterGroupIndex}-listen`,
      kind: "listen",
      prompt: `Which word did you hear?`,
      target: word,
      options: [word, distractor, "moon"].filter((v, i, a) => a.indexOf(v) === i),
    },
  ];
}

export function scoreGroupAssessment(
  letterGroupIndex: number,
  itemResults: { id: string; kind: GroupAssessmentItemKind; correct: boolean }[],
  skills: ReadingSkillsState,
): GroupAssessmentResult {
  const items = buildGroupAssessment(letterGroupIndex);
  const correct = itemResults.filter((r) => r.correct).length;
  const scorePct =
    itemResults.length === 0
      ? 0
      : Math.round((correct / itemResults.length) * 100);

  const byKind: Partial<Record<GroupAssessmentItemKind, number>> = {};
  for (const kind of [
    "sound_id",
    "letter_id",
    "blend",
    "segment",
    "read_word",
    "listen",
  ] as GroupAssessmentItemKind[]) {
    const subset = itemResults.filter((r) => r.kind === kind);
    if (subset.length === 0) continue;
    byKind[kind] = Math.round(
      (subset.filter((r) => r.correct).length / subset.length) * 100,
    );
  }

  const skillScores = skillScoresMap(skills);
  const blendingAccuracy = byKind.blend ?? skills.skills.blending.score;
  const readingAccuracy = byKind.read_word ?? skills.skills.reading.score;
  const gate = canUnlockNextLetterGroup({
    letterGroupIndex,
    skillScores,
    blendingAccuracy: Math.max(blendingAccuracy, scorePct),
    readingAccuracy: Math.max(readingAccuracy, scorePct),
  });

  return {
    letterGroupIndex,
    scorePct,
    byKind,
    skillScores,
    canAdvance: gate.ok && scorePct >= 70,
    reason: gate.ok
      ? scorePct >= 70
        ? gate.reason
        : "Assessment score needs to be at least 70%."
      : gate.reason,
    items,
  };
}
