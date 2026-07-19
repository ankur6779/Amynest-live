import type { AbacusSkillId } from "./mastery.js";
import { ABACUS_SKILLS, type MasteryState } from "./mastery.js";

export type ReviewCard = {
  skill: AbacusSkillId;
  /** Interval in days until next review. */
  intervalDays: number;
  ease: number;
  dueAt: string;
  reps: number;
  lapses: number;
};

export type ReviewSchedule = Record<AbacusSkillId, ReviewCard>;

export function emptyReviewSchedule(now = new Date()): ReviewSchedule {
  const out = {} as ReviewSchedule;
  for (const skill of ABACUS_SKILLS) {
    out[skill] = {
      skill,
      intervalDays: 0,
      ease: 2.3,
      dueAt: now.toISOString(),
      reps: 0,
      lapses: 0,
    };
  }
  return out;
}

/** SM-2 inspired update — weak skills shorten intervals. */
export function applyReviewResult(
  schedule: ReviewSchedule,
  skill: AbacusSkillId,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  now = new Date(),
): ReviewSchedule {
  const prev = schedule[skill] ?? emptyReviewSchedule(now)[skill];
  let ease = Math.max(1.3, prev.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  let intervalDays: number;
  let reps = prev.reps;
  let lapses = prev.lapses;

  if (quality < 3) {
    reps = 0;
    lapses += 1;
    intervalDays = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round(prev.intervalDays * ease));
  }

  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + intervalDays);

  return {
    ...schedule,
    [skill]: {
      skill,
      intervalDays,
      ease,
      dueAt: due.toISOString(),
      reps,
      lapses,
    },
  };
}

export function dueSkills(schedule: ReviewSchedule, now = new Date()): AbacusSkillId[] {
  const t = now.getTime();
  return ABACUS_SKILLS.filter((s) => {
    const card = schedule[s];
    if (!card) return true;
    return Date.parse(card.dueAt) <= t;
  });
}

/** Prefer weak mastery skills that are also due. */
export function nextReviewSkill(
  schedule: ReviewSchedule,
  mastery: MasteryState | null | undefined,
  now = new Date(),
): AbacusSkillId | null {
  const due = dueSkills(schedule, now);
  if (due.length === 0) return null;
  if (!mastery) return due[0] ?? null;
  return [...due].sort((a, b) => (mastery[a]?.score ?? 0) - (mastery[b]?.score ?? 0))[0] ?? null;
}

export function skillToLevelHint(skill: AbacusSkillId): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  switch (skill) {
    case "counting":
      return 1;
    case "addition":
      return 2;
    case "subtraction":
      return 3;
    case "carry":
    case "borrow":
      return 4;
    case "mental_speed":
      return 5;
    case "multiplication":
      return 6;
    case "division":
      return 7;
  }
}
