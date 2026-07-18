/**
 * Phase 7.5 — Skill mastery (local, lightweight).
 * Hidden 0–100 score; parents see stages only. No XP / coins / streaks.
 */
import type { AgeBand } from "@/lib/game-learning";
import { getGameLearning } from "@/lib/game-learning";
import { GAMES, type GameDef } from "@/lib/games";

export type MasteryStageId = 1 | 2 | 3 | 4 | 5;

export interface MasteryStage {
  id: MasteryStageId;
  key: "starter" | "growing" | "confident" | "explorer" | "master";
  label: string;
  emoji: string;
  /** Inclusive min score for this stage. */
  minScore: number;
}

export const MASTERY_STAGES: MasteryStage[] = [
  { id: 1, key: "starter", label: "Starter", emoji: "🌱", minScore: 0 },
  { id: 2, key: "growing", label: "Growing", emoji: "🌿", minScore: 20 },
  { id: 3, key: "confident", label: "Confident", emoji: "⭐", minScore: 40 },
  { id: 4, key: "explorer", label: "Explorer", emoji: "🚀", minScore: 60 },
  { id: 5, key: "master", label: "Master", emoji: "🏆", minScore: 80 },
];

export type VisualThemeId = "ocean" | "space" | "forest" | "safari" | "arctic";

export const VISUAL_THEMES: {
  id: VisualThemeId;
  label: string;
  /** Unlock when any game reaches this stage. */
  unlockAtStage: MasteryStageId;
  tint: string;
}[] = [
  { id: "ocean", label: "Ocean", unlockAtStage: 2, tint: "rgba(56, 189, 248, 0.12)" },
  { id: "forest", label: "Forest", unlockAtStage: 3, tint: "rgba(74, 222, 128, 0.12)" },
  { id: "space", label: "Space", unlockAtStage: 3, tint: "rgba(167, 139, 250, 0.14)" },
  { id: "safari", label: "Safari", unlockAtStage: 4, tint: "rgba(251, 191, 36, 0.12)" },
  { id: "arctic", label: "Arctic", unlockAtStage: 5, tint: "rgba(186, 230, 253, 0.16)" },
];

/** Child-facing practice families (result screen) — never raw scores. */
export type PracticeSkillFamily =
  | "Working Memory"
  | "Pattern Thinking"
  | "Attention"
  | "Planning"
  | "Self Control"
  | "Visual Processing"
  | "Number Sense"
  | "Kind Choices";

const PRACTICE_FAMILY: Record<string, PracticeSkillFamily> = {
  "pattern-match": "Pattern Thinking",
  "odd-one-out": "Pattern Thinking",
  "card-flip": "Working Memory",
  sequence: "Working Memory",
  "color-memory": "Working Memory",
  "speed-math": "Number Sense",
  "number-match": "Number Sense",
  "find-mistake": "Attention",
  "target-tap": "Self Control",
  "what-should-you-do": "Kind Choices",
  "spot-difference": "Attention",
  "hidden-objects": "Attention",
  "color-fill": "Planning",
  "shape-match": "Visual Processing",
  "maze-escape": "Planning",
};

const STORAGE_KEY = "amynest_game_mastery_v1";
const THEME_KEY = "amynest_game_theme_v1";
const WINDOW = 5;

export interface MasterySessionSample {
  at: number;
  accuracy: number;
  completed: boolean;
  /** 0–1; higher = steadier answers / fewer wild swings. */
  consistency: number;
  /** 0–1; 0 = no hints. */
  hintLoad: number;
  calm: boolean;
}

export interface GameMasteryRecord {
  score: number;
  samples: MasterySessionSample[];
  updatedAt: number;
}

type Store = Record<string, GameMasteryRecord>;

function sanitizeRecord(raw: unknown): GameMasteryRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GameMasteryRecord>;
  const score = typeof r.score === "number" && Number.isFinite(r.score) ? r.score : 0;
  const samples = Array.isArray(r.samples)
    ? r.samples.filter(
        (s) =>
          s &&
          typeof s.accuracy === "number" &&
          typeof s.at === "number" &&
          typeof s.completed === "boolean",
      )
    : [];
  return {
    score: Math.max(0, Math.min(100, score)),
    samples: samples.slice(-WINDOW) as MasterySessionSample[],
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

function safeParse(raw: string | null): Store {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Store = {};
    for (const [id, rec] of Object.entries(parsed)) {
      const clean = sanitizeRecord(rec);
      if (clean) out[id] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

function readStore(): Store {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Quota / private mode — prune samples and retry once (GA storage pressure). */
    try {
      const pruned: Store = {};
      for (const [id, rec] of Object.entries(store)) {
        pruned[id] = { ...rec, samples: rec.samples.slice(-2) };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      /* ignore — mastery stays in-memory for this session only */
    }
  }
}

export function stageFromScore(score: number): MasteryStage {
  const clamped = Math.max(0, Math.min(100, score));
  let stage = MASTERY_STAGES[0];
  for (const s of MASTERY_STAGES) {
    if (clamped >= s.minScore) stage = s;
  }
  return stage;
}

export function getPracticeSkillFamily(gameId: string): PracticeSkillFamily {
  return PRACTICE_FAMILY[gameId] ?? "Attention";
}

/** Recommendation verbs for weaker families. */
export function nextSkillCue(family: PracticeSkillFamily): string {
  switch (family) {
    case "Working Memory":
      return "Practice Working Memory";
    case "Pattern Thinking":
      return "Improve Pattern Recognition";
    case "Attention":
      return "Strengthen Attention";
    case "Planning":
      return "Build Planning";
    case "Self Control":
      return "Practice Self Control";
    case "Visual Processing":
      return "Build Visual Processing";
    case "Number Sense":
      return "Grow Number Sense";
    case "Kind Choices":
      return "Practice Kind Choices";
    default:
      return "Try a gentle next skill";
  }
}

export function ageBandFromYears(ageYears: number | null | undefined): AgeBand {
  if (ageYears == null || Number.isNaN(ageYears)) return "5-6";
  if (ageYears < 5) return "3-4";
  if (ageYears < 7) return "5-6";
  return "7-8";
}

export function ageBandFromMonths(ageMonths: number | null | undefined): AgeBand {
  if (ageMonths == null || Number.isNaN(ageMonths)) return "5-6";
  return ageBandFromYears(ageMonths / 12);
}

/** Age-aware starting stage (content floor for early sessions). */
export function ageDefaultStage(band: AgeBand): MasteryStageId {
  if (band === "3-4") return 1;
  return 2; // 5–6 and 7–8 start Growing
}

export function getGameMastery(gameId: string): GameMasteryRecord {
  const store = readStore();
  return store[gameId] ?? { score: 0, samples: [], updatedAt: 0 };
}

export function getMasteryStage(gameId: string): MasteryStage {
  return stageFromScore(getGameMastery(gameId).score);
}

/** Parent chip: Growing 🌿 or Growing (2/5) */
export function formatParentMastery(gameId: string, withFraction = false): string {
  const stage = getMasteryStage(gameId);
  if (withFraction) return `${stage.label} (${stage.id}/5)`;
  return `${stage.label} ${stage.emoji}`;
}

export function formatParentSkillMastery(game: GameDef | string, withFraction = false): string {
  const id = typeof game === "string" ? game : game.id;
  const skill = getGameLearning(id).skillName;
  return `${skill} · ${formatParentMastery(id, withFraction)}`;
}

/**
 * Rolling-window mastery update.
 * Gradual growth; one bad session never crashes the score.
 */
export function computeMasteryScore(samples: MasterySessionSample[]): number {
  const window = samples.slice(-WINDOW);
  if (window.length === 0) return 0;

  let weighted = 0;
  let weightSum = 0;
  window.forEach((s, i) => {
    const recency = 0.7 + (i / Math.max(1, window.length - 1)) * 0.3;
    const quality =
      s.accuracy * 0.5 +
      (s.completed ? 0.2 : 0.05) +
      s.consistency * 0.15 +
      (1 - s.hintLoad) * 0.1 +
      (s.calm ? 0.05 : 0);
    // Mild anti-grind: near-identical low-effort repeats contribute less
    const grind =
      window.filter((x) => Math.abs(x.accuracy - s.accuracy) < 0.05).length >= 4 ? 0.85 : 1;
    const w = recency * grind;
    weighted += quality * 100 * w;
    weightSum += w;
  });

  return Math.round(Math.max(0, Math.min(100, weighted / weightSum)));
}

export interface RecordMasteryInput {
  gameId: string;
  score: number;
  total: number;
  /** Optional — default 0. */
  hintsUsed?: number;
  /** Optional — treat very low accuracy as frustration (soft). */
  frustrated?: boolean;
}

export function recordMasterySession(input: RecordMasteryInput): GameMasteryRecord {
  const { gameId, score, total } = input;
  const accuracy = total > 0 ? Math.max(0, Math.min(1, score / total)) : 0;
  const completed = total > 0 && score >= 0;
  const hintLoad = Math.max(0, Math.min(1, (input.hintsUsed ?? 0) / 4));
  const calm = input.frustrated === true ? false : accuracy >= 0.35 || total === 0;
  const consistency = Math.max(0.2, Math.min(1, 1 - Math.abs(accuracy - 0.75) * 0.5));

  const store = readStore();
  const prev = store[gameId] ?? { score: 0, samples: [], updatedAt: 0 };
  const sample: MasterySessionSample = {
    at: Date.now(),
    accuracy,
    completed,
    consistency,
    hintLoad,
    calm,
  };
  const samples = [...prev.samples, sample].slice(-12);
  let nextScore = computeMasteryScore(samples);

  // Soft floor: never drop more than 8 points from prior mastery in one session
  if (nextScore < prev.score - 8) nextScore = prev.score - 8;
  // Soft ceiling: one lucky session can't jump more than +12
  if (nextScore > prev.score + 12) nextScore = prev.score + 12;
  // Tiny progress for finishing even when accuracy is low (effort)
  if (completed && accuracy < 0.4 && nextScore <= prev.score) {
    nextScore = Math.min(100, prev.score + 1);
  }

  const record: GameMasteryRecord = {
    score: Math.max(0, Math.min(100, nextScore)),
    samples: samples.slice(-WINDOW),
    updatedAt: Date.now(),
  };
  store[gameId] = record;
  writeStore(store);
  syncThemeUnlocks(store);
  return record;
}

function syncThemeUnlocks(store: Store): void {
  const maxStage = Math.max(
    1,
    ...Object.values(store).map((r) => stageFromScore(r.score).id),
  ) as MasteryStageId;
  try {
    const unlocked = new Set<VisualThemeId>(
      VISUAL_THEMES.filter((t) => t.unlockAtStage <= maxStage).map((t) => t.id),
    );
    const prev = safeThemeList(localStorage.getItem(THEME_KEY));
    for (const id of prev.unlocked) unlocked.add(id);
    const active =
      prev.active && unlocked.has(prev.active) ? prev.active : [...unlocked][0] ?? null;
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ unlocked: [...unlocked], active }),
    );
  } catch {
    /* ignore */
  }
}

function safeThemeList(raw: string | null): {
  unlocked: VisualThemeId[];
  active: VisualThemeId | null;
} {
  if (!raw) return { unlocked: [], active: null };
  try {
    const p = JSON.parse(raw) as { unlocked?: VisualThemeId[]; active?: VisualThemeId | null };
    return {
      unlocked: Array.isArray(p.unlocked) ? p.unlocked : [],
      active: p.active ?? null,
    };
  } catch {
    return { unlocked: [], active: null };
  }
}

export function getUnlockedThemes(): VisualThemeId[] {
  return safeThemeList(
    typeof localStorage !== "undefined" ? localStorage.getItem(THEME_KEY) : null,
  ).unlocked;
}

export function getActiveTheme(): VisualThemeId | null {
  return safeThemeList(
    typeof localStorage !== "undefined" ? localStorage.getItem(THEME_KEY) : null,
  ).active;
}

export function setActiveTheme(id: VisualThemeId | null): void {
  const cur = safeThemeList(localStorage.getItem(THEME_KEY));
  if (id && !cur.unlocked.includes(id)) return;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify({ unlocked: cur.unlocked, active: id }));
  } catch {
    /* ignore */
  }
}

export function getThemeTint(id: VisualThemeId | null): string | null {
  if (!id) return null;
  return VISUAL_THEMES.find((t) => t.id === id)?.tint ?? null;
}

/** Aggregate weakest practice family across catalog (for recommendations). */
export function getWeakestPracticeFamilies(limit = 3): PracticeSkillFamily[] {
  const byFamily = new Map<PracticeSkillFamily, number[]>();
  for (const g of GAMES) {
    const family = getPracticeSkillFamily(g.id);
    const score = getGameMastery(g.id).score;
    const list = byFamily.get(family) ?? [];
    list.push(score);
    byFamily.set(family, list);
  }
  return [...byFamily.entries()]
    .map(([family, scores]) => ({
      family,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      plays: scores.filter((s) => s > 0).length,
    }))
    .sort((a, b) => {
      // Prefer families with some play but lower mastery; then never-played
      if (a.plays === 0 && b.plays > 0) return 1;
      if (b.plays === 0 && a.plays > 0) return -1;
      return a.avg - b.avg;
    })
    .slice(0, limit)
    .map((x) => x.family);
}

export function listMasteryForCatalog(): { gameId: string; stage: MasteryStage; score: number }[] {
  return GAMES.map((g) => {
    const rec = getGameMastery(g.id);
    return { gameId: g.id, stage: stageFromScore(rec.score), score: rec.score };
  });
}
