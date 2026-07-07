import type { OutcomeSignals } from "../outcomes/types.js";

export interface ParentValueScore {
  /** 0–100 composite of value delivered to this family recently. */
  score: number;
  band: "none" | "low" | "moderate" | "high";
  /** Per-domain contribution counts actually observed (never inflated). */
  breakdown: {
    routines: number;
    lessons: number;
    speech: number;
    nutrition: number;
    stories: number;
    worksheets: number;
    coach: number;
  };
  /** The single strongest, truthful proof point — or null if none exists. */
  topProof: { key: string; count: number } | null;
}

/**
 * Continuously quantify the value AmyNest has delivered to a family, from real
 * activity. Used to personalize premium messaging with honest proof — it never
 * exaggerates and returns `topProof: null` when there is nothing genuine.
 */
export function computeParentValueScore(s: OutcomeSignals): ParentValueScore {
  const a = s.activity;
  const breakdown = {
    routines: a?.routinesCompleted7d ?? s.routinesCompletedToday,
    lessons: a?.lessonsCompleted7d ?? s.lessonsCompleted7d,
    speech: a?.speechSessions7d ?? 0,
    nutrition: a?.nutritionPlans7d ?? 0,
    stories: a?.storiesPlayed7d ?? 0,
    worksheets: a?.worksheetsCompleted7d ?? 0,
    coach: a?.coachInteractions7d ?? 0,
  };

  // Weighted value: high-effort/high-outcome activities count more. Each domain
  // saturates so a single very active domain can't max the score alone.
  const raw =
    saturate(breakdown.routines, 7) * 22 +
    saturate(breakdown.lessons, 10) * 22 +
    saturate(breakdown.speech, 5) * 16 +
    saturate(breakdown.nutrition, 5) * 12 +
    saturate(breakdown.worksheets, 5) * 12 +
    saturate(breakdown.stories, 7) * 8 +
    saturate(breakdown.coach, 5) * 8;

  // Consistency bonus: rewards breadth + streaks (habit = realized value).
  const consistency = Math.min(1, s.currentStreakDays / 7) * 0.1;
  const score = clampScore(raw * (1 + consistency));

  const topProof = pickTopProof(breakdown);

  return { score, band: scoreToBand(score), breakdown, topProof };
}

function pickTopProof(b: ParentValueScore["breakdown"]): ParentValueScore["topProof"] {
  const entries: Array<[string, number]> = [
    ["routines", b.routines],
    ["lessons", b.lessons],
    ["speech", b.speech],
    ["worksheets", b.worksheets],
    ["nutrition", b.nutrition],
    ["stories", b.stories],
    ["coach", b.coach],
  ];
  entries.sort((x, y) => y[1] - x[1]);
  const [key, count] = entries[0]!;
  return count > 0 ? { key, count } : null;
}

function saturate(value: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  return Math.min(1, Math.max(0, value) / ceiling);
}

function scoreToBand(score: number): ParentValueScore["band"] {
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  if (score >= 10) return "low";
  return "none";
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
