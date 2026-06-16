import type {
  ChildCurriculumProgress,
  CurriculumLevel,
  PhonicsDailyPlan,
  PlanActivity,
  PlanActivityKind,
} from "./types.js";
import { gameModeForActivity } from "./games.js";
import { getCurriculumLevelDef } from "./levels.js";
import {
  phonemeToRevisionLabel,
  pickPracticeTargets,
  pickRevisionPhoneme,
} from "./personalize.js";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { familyIdForAnchorWord } from "./levels.js";

export interface GenerateDailyPlanInput {
  progress: ChildCurriculumProgress;
  dateIso: string;
  /** Deterministic seed (childId ^ date). */
  seed: number;
  completedActivityIds?: string[];
}

function activityKindForTarget(level: CurriculumLevel, target: string): PlanActivityKind {
  const t = target.trim().toLowerCase();
  if (level === 3 && familyIdForAnchorWord(t)) return "read_word";
  if (getCvcWordEntry(t)) return "blend_word";
  if (level === 1 && t.length <= 2) return "letter_sound";
  if (level >= 7 || t.includes(" ")) return "sentence";
  if (level >= 6 && getCvcWordEntry(t) === undefined && t.length >= 4) return "read_word";
  if (level >= 4 && ["sh", "ch", "th", "wh", "ph"].some((d) => t.startsWith(d))) {
    return "digraph";
  }
  if (level >= 5) return "blend_cluster";
  if (t.length <= 4) return "read_word";
  return "read_word";
}

function makeActivity(
  id: string,
  kind: PlanActivityKind,
  target: string,
  level: CurriculumLevel,
  completed: boolean,
): PlanActivity {
  return {
    id,
    kind,
    gameMode: gameModeForActivity(kind),
    label: formatLabel(kind, target),
    target,
    level,
    completed,
  };
}

function formatLabel(kind: PlanActivityKind, target: string): string {
  const familyId = familyIdForAnchorWord(target);
  if (familyId) return `Practice ${familyId.toUpperCase()} family`;
  switch (kind) {
    case "blend_word":
      return `Blend ${target}`;
    case "revision_phoneme":
      return target;
    case "daily_test":
      return "Daily test (5 questions)";
    case "letter_sound":
      return `Letter ${target.toUpperCase()}`;
    case "sentence":
      return target;
    default:
      return `Practice ${target}`;
  }
}

/**
 * Build today's personalised plan: 2 practice, 1 revision, 1 test.
 */
export function generateDailyPlan(input: GenerateDailyPlanInput): PhonicsDailyPlan {
  const { progress, dateIso, seed } = input;
  const done = new Set(input.completedActivityIds ?? []);
  const level = progress.currentLevel;
  const levelDef = getCurriculumLevelDef(level);

  const practiceTargets = pickPracticeTargets(level, progress.weakPhonemes, 2, seed);
  const practice: PlanActivity[] = practiceTargets.map((target, i) => {
    const kind = activityKindForTarget(level, target);
    const id = `${dateIso}-practice-${i}-${target}`;
    return makeActivity(id, kind, target, level, done.has(id));
  });

  const revPhoneme = pickRevisionPhoneme(progress.weakPhonemes, level, seed + 7);
  const revLabel = phonemeToRevisionLabel(revPhoneme);
  const revId = `${dateIso}-revision-${revPhoneme}`;
  const revision: PlanActivity[] = [
    makeActivity(revId, "revision_phoneme", revLabel, level, done.has(revId)),
  ];

  const testId = `${dateIso}-test-daily`;
  const test = makeActivity(
    testId,
    "daily_test",
    "5 mixed questions",
    level,
    done.has(testId),
  );

  return {
    date: dateIso,
    childId: progress.childId,
    currentLevel: level,
    levelName: levelDef.name,
    masteryScore: progress.masteryScore,
    streak: progress.streak,
    practice,
    revision,
    test,
    weakPhonemes: progress.weakPhonemes,
  };
}

export function planCompletionPct(
  plan: PhonicsDailyPlan,
  completedIds: Set<string>,
): number {
  const all = [...plan.practice, ...plan.revision, plan.test];
  if (all.length === 0) return 0;
  const done = all.filter((a) => completedIds.has(a.id) || a.completed).length;
  return Math.round((done / all.length) * 100);
}
