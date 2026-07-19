import type { LevelId } from "./index.js";

/** Pedagogical skills tracked independently of level unlocks. */
export type AbacusSkillId =
  | "counting"
  | "addition"
  | "subtraction"
  | "carry"
  | "borrow"
  | "multiplication"
  | "division"
  | "mental_speed";

export type MasteryTier = "beginner" | "developing" | "strong" | "master" | "legend";

export type SkillMastery = {
  skill: AbacusSkillId;
  /** 0–100 continuous score. */
  score: number;
  tier: MasteryTier;
  attempts: number;
  correct: number;
  bestStreak: number;
  currentStreak: number;
  updatedAt: string;
};

export type MasteryState = Record<AbacusSkillId, SkillMastery>;

export const ABACUS_SKILLS: readonly AbacusSkillId[] = [
  "counting",
  "addition",
  "subtraction",
  "carry",
  "borrow",
  "multiplication",
  "division",
  "mental_speed",
] as const;

export const SKILL_LABELS: Record<AbacusSkillId, string> = {
  counting: "Counting",
  addition: "Addition",
  subtraction: "Subtraction",
  carry: "Carry",
  borrow: "Borrow",
  multiplication: "Multiplication",
  division: "Division",
  mental_speed: "Mental Speed",
};

export function tierFromScore(score: number): MasteryTier {
  if (score >= 92) return "legend";
  if (score >= 80) return "master";
  if (score >= 60) return "strong";
  if (score >= 35) return "developing";
  return "beginner";
}

export function emptySkill(skill: AbacusSkillId): SkillMastery {
  return {
    skill,
    score: 0,
    tier: "beginner",
    attempts: 0,
    correct: 0,
    bestStreak: 0,
    currentStreak: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export function emptyMasteryState(): MasteryState {
  const out = {} as MasteryState;
  for (const s of ABACUS_SKILLS) out[s] = emptySkill(s);
  return out;
}

/** Map level + mode to the primary skill being practiced. */
export function skillForLevelMode(
  level: LevelId,
  mode: "learn" | "practice" | "challenge" | "mental" | "tutor" | "warmup",
): AbacusSkillId {
  if (mode === "mental") return "mental_speed";
  switch (level) {
    case 1:
      return "counting";
    case 2:
      return "addition";
    case 3:
      return "subtraction";
    case 4:
      return "carry";
    case 5:
      return "mental_speed";
    case 6:
      return "multiplication";
    case 7:
      return "division";
  }
}

/**
 * Update mastery after one attempt.
 * Correct + fast answers climb faster; wrong answers decay gently.
 */
export function applyMasteryAttempt(
  state: MasteryState,
  skill: AbacusSkillId,
  input: { correct: boolean; elapsedMs?: number; fastBonusMs?: number },
): MasteryState {
  const prev = state[skill] ?? emptySkill(skill);
  const attempts = prev.attempts + 1;
  const correct = prev.correct + (input.correct ? 1 : 0);
  const currentStreak = input.correct ? prev.currentStreak + 1 : 0;
  const bestStreak = Math.max(prev.bestStreak, currentStreak);

  let delta = input.correct ? 4 : -2;
  const fastCut = input.fastBonusMs ?? 3000;
  if (input.correct && typeof input.elapsedMs === "number" && input.elapsedMs <= fastCut) {
    delta += 2;
  }
  if (currentStreak >= 3 && input.correct) delta += 1;

  const score = Math.max(0, Math.min(100, prev.score + delta));
  return {
    ...state,
    [skill]: {
      skill,
      score,
      tier: tierFromScore(score),
      attempts,
      correct,
      bestStreak,
      currentStreak,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function strongestSkill(state: MasteryState): SkillMastery | null {
  let best: SkillMastery | null = null;
  for (const s of ABACUS_SKILLS) {
    const row = state[s];
    if (!row || row.attempts === 0) continue;
    if (!best || row.score > best.score) best = row;
  }
  return best;
}

export function weakestSkill(state: MasteryState): SkillMastery | null {
  let worst: SkillMastery | null = null;
  for (const s of ABACUS_SKILLS) {
    const row = state[s];
    if (!row || row.attempts < 3) continue;
    if (!worst || row.score < worst.score) worst = row;
  }
  return worst;
}

export function masterySummary(state: MasteryState): {
  averageScore: number;
  strongest: SkillMastery | null;
  weakest: SkillMastery | null;
  masters: number;
} {
  const active = ABACUS_SKILLS.map((s) => state[s]).filter((r) => r.attempts > 0);
  const averageScore =
    active.length === 0
      ? 0
      : Math.round(active.reduce((a, r) => a + r.score, 0) / active.length);
  return {
    averageScore,
    strongest: strongestSkill(state),
    weakest: weakestSkill(state),
    masters: active.filter((r) => r.tier === "master" || r.tier === "legend").length,
  };
}
