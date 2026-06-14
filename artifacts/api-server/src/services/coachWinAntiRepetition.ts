import type { CoachWin } from "./coachWinGenerationService.js";

export type CoachingCategory =
  | "observation"
  | "emotional"
  | "communication"
  | "environment"
  | "routine"
  | "reinforcement"
  | "parent_regulation"
  | "problem_solving"
  | "skill_building"
  | "reflection";

export type CoachWinFeedbackEntry = {
  winNumber: number;
  title: string;
  feedback: "yes" | "somewhat" | "no";
};

export type CoachWinLike = Pick<
  CoachWin,
  "title" | "objective" | "deep_explanation" | "actions" | "example"
>;

const TITLE_HISTORY_LIMIT = 5;
const ACTION_HISTORY_WINS = 3;

/** Phase 2 certification thresholds */
export const SEMANTIC_THRESHOLDS = {
  title: 0.8,
  action: 0.75,
  rationale: 0.75,
  example: 0.75,
} as const;

/** Normalize coaching phrases to detect semantic duplicates across wording variants. */
const SEMANTIC_EQUIVALENCE_GROUPS: string[][] = [
  ["pause before react", "pause before respond", "take a pause before", "stop before reacting"],
  ["name the feeling", "label the emotion", "name one feeling", "say one feeling word"],
  ["connect before correct", "connect before you correct", "get on eye level"],
  ["identify trigger", "identify the real trigger", "find the pattern", "track the pattern"],
];

function canonicalSemanticKey(text: string): string {
  const norm = normalizeCoachText(text);
  for (const group of SEMANTIC_EQUIVALENCE_GROUPS) {
    for (const phrase of group) {
      if (norm.includes(phrase)) return group[0]!;
    }
  }
  return norm;
}

export function semanticSimilarity(a: string, b: string): number {
  const ca = canonicalSemanticKey(a);
  const cb = canonicalSemanticKey(b);
  if (ca === cb && ca.length > 0) return 1;
  return jaccardSimilarity(a, b);
}

export type SemanticDuplicateFlag = {
  winA: number;
  winB: number;
  field: "title" | "action" | "rationale" | "example";
  score: number;
  sampleA: string;
  sampleB: string;
};

export function auditSemanticDuplicates(
  wins: CoachWinLike[],
  options?: { maxWins?: number },
): SemanticDuplicateFlag[] {
  const slice = wins.slice(0, options?.maxWins ?? 20);
  const flags: SemanticDuplicateFlag[] = [];

  for (let i = 0; i < slice.length; i += 1) {
    for (let j = i + 1; j < slice.length; j += 1) {
      const a = slice[i]!;
      const b = slice[j]!;

      const titleScore = semanticSimilarity(a.title, b.title);
      if (titleScore > SEMANTIC_THRESHOLDS.title) {
        flags.push({
          winA: i + 1,
          winB: j + 1,
          field: "title",
          score: titleScore,
          sampleA: a.title,
          sampleB: b.title,
        });
      }

      for (const actionA of a.actions ?? []) {
        for (const actionB of b.actions ?? []) {
          const actionScore = semanticSimilarity(actionA, actionB);
          if (actionScore > SEMANTIC_THRESHOLDS.action) {
            flags.push({
              winA: i + 1,
              winB: j + 1,
              field: "action",
              score: actionScore,
              sampleA: actionA,
              sampleB: actionB,
            });
          }
        }
      }

      if (a.deep_explanation && b.deep_explanation) {
        const rationaleScore = semanticSimilarity(a.deep_explanation, b.deep_explanation);
        if (rationaleScore > SEMANTIC_THRESHOLDS.rationale) {
          flags.push({
            winA: i + 1,
            winB: j + 1,
            field: "rationale",
            score: rationaleScore,
            sampleA: a.deep_explanation.slice(0, 80),
            sampleB: b.deep_explanation.slice(0, 80),
          });
        }
      }

      if (a.example && b.example) {
        const exampleScore = semanticSimilarity(a.example, b.example);
        if (exampleScore > SEMANTIC_THRESHOLDS.example) {
          flags.push({
            winA: i + 1,
            winB: j + 1,
            field: "example",
            score: exampleScore,
            sampleA: a.example.slice(0, 80),
            sampleB: b.example.slice(0, 80),
          });
        }
      }
    }
  }

  return flags;
}

export function areSemanticallyDuplicatePhrase(a: string, b: string, field: keyof typeof SEMANTIC_THRESHOLDS): boolean {
  return semanticSimilarity(a, b) > SEMANTIC_THRESHOLDS[field];
}

export function normalizeCoachText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeCoachText(text)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) {
    if (sb.has(t)) inter += 1;
  }
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function isDuplicateTitle(title: string, recentTitles: string[]): boolean {
  const norm = normalizeCoachText(title);
  if (!norm) return false;
  for (const prior of recentTitles) {
    const priorNorm = normalizeCoachText(prior);
    if (priorNorm === norm) return true;
    if (semanticSimilarity(title, prior) >= SEMANTIC_THRESHOLDS.title) return true;
  }
  return false;
}

export function hasOverlappingActions(
  actions: string[],
  recentWins: CoachWinLike[],
): boolean {
  const recentActions = recentWins
    .slice(-ACTION_HISTORY_WINS)
    .flatMap((w) => w.actions ?? [])
    .map(normalizeCoachText)
    .filter(Boolean);
  for (const action of actions) {
    const norm = normalizeCoachText(action);
    if (!norm) continue;
    for (const prior of recentActions) {
      if (prior === norm) return true;
      if (semanticSimilarity(action, prior) >= SEMANTIC_THRESHOLDS.action) return true;
    }
  }
  return false;
}

export function isWinTooSimilar(
  candidate: CoachWinLike,
  recentWins: CoachWinLike[],
  options?: { checkRationale?: boolean },
): boolean {
  const recentTitles = recentWins.map((w) => w.title);
  if (isDuplicateTitle(candidate.title, recentTitles)) return true;
  if (hasOverlappingActions(candidate.actions ?? [], recentWins)) return true;

  if (options?.checkRationale !== false && candidate.deep_explanation) {
    for (const prior of recentWins.slice(-3)) {
      if (!prior.deep_explanation) continue;
      if (jaccardSimilarity(candidate.deep_explanation, prior.deep_explanation) >= SEMANTIC_THRESHOLDS.rationale) {
        return true;
      }
    }
  }

  if (candidate.example) {
    for (const prior of recentWins.slice(-3)) {
      if (!prior.example) continue;
      if (semanticSimilarity(candidate.example, prior.example) >= SEMANTIC_THRESHOLDS.example) return true;
    }
  }

  return false;
}

export function recentWinTitles(wins: CoachWinLike[], limit = TITLE_HISTORY_LIMIT): string[] {
  return wins.slice(-limit).map((w) => w.title);
}

export function buildAntiRepetitionPromptBlock(recentWins: CoachWinLike[]): string {
  if (recentWins.length === 0) return "";
  const titles = recentWinTitles(recentWins, TITLE_HISTORY_LIMIT);
  const actions = recentWins
    .slice(-ACTION_HISTORY_WINS)
    .flatMap((w) => w.actions ?? [])
    .slice(0, 12);
  return [
    "ANTI-REPETITION (mandatory):",
    `- Do NOT reuse or rephrase these recent titles: ${titles.map((t) => `"${t}"`).join(", ")}`,
    actions.length > 0
      ? `- Do NOT repeat these recent action steps: ${actions.map((a) => `"${a}"`).join("; ")}`
      : "",
    "- Rotate coaching layer: observation → emotional → communication → environment → routine → reinforcement → parent regulation → problem solving → skill building → reflection.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFeedbackPromptBlock(feedback: CoachWinFeedbackEntry[]): string {
  if (feedback.length === 0) return "";
  const lines = feedback.map((f) => {
    const label =
      f.feedback === "yes"
        ? "WORKED — advance difficulty and unlock the next coaching layer"
        : f.feedback === "somewhat"
          ? "PARTIALLY WORKED — offer a variation of the same skill with a smaller step"
          : "NOT WORKED — switch intervention approach; explain why the strategy is changing";
    return `Win #${f.winNumber} "${f.title}": ${label}`;
  });
  return ["PARENT FEEDBACK HISTORY (adapt the next win accordingly):", ...lines].join("\n");
}

export function coachingCategoryForWinNumber(winNumber: number): CoachingCategory {
  const order: CoachingCategory[] = [
    "observation",
    "emotional",
    "communication",
    "environment",
    "routine",
    "reinforcement",
    "parent_regulation",
    "problem_solving",
    "skill_building",
    "reflection",
  ];
  return order[(winNumber - 1) % order.length]!;
}

export function buildDiversityPromptBlock(winNumber: number): string {
  const category = coachingCategoryForWinNumber(winNumber);
  return `DIVERSITY REQUIREMENT: Win #${winNumber} must primarily use the "${category.replace(/_/g, " ")}" coaching layer — distinct from prior wins.`;
}
