/**
 * Hub presentation helpers — no new economy, XP, or mechanics.
 * Maps existing game/skill data into parent- and child-friendly UI labels.
 *
 * Benchmark: Khan Kids (one primary Play), Duolingo (Today path),
 * Apple HIG (clear hierarchy, thumb reach), Lingokids (For You strips).
 */
import {
  GAMES,
  amySuggestion,
  canPlayGame,
  getPlayLog,
  getSkills,
  type GameCategory,
  type GameDef,
} from "@/lib/games";
import { getGameLearning } from "@/lib/game-learning";
import {
  formatParentMastery,
  getPracticeSkillFamily,
  getWeakestPracticeFamilies,
  nextSkillCue,
} from "@/lib/game-mastery";

/** Short skill tags for cards — scannable in ~3s for parents. */
export const SKILL_TAG: Record<GameCategory, string> = {
  brain: "Patterns",
  memory: "Memory",
  math: "Numbers",
  focus: "Attention",
  creativity: "Shapes & colour",
  behavior: "Kind choices",
  action: "Planning",
  puzzle: "Problems",
};

/**
 * Estimated session length from known session structure (8 rounds).
 * Not a timer — helps parents plan (Khan Kids / Apple HIG time cues).
 */
export function getEstimatedPlayMinutes(game: GameDef): number {
  switch (game.category) {
    case "behavior":
      return 4;
    case "memory":
    case "action":
      return 3;
    case "focus":
      return game.id === "spot-difference" || game.id === "hidden-objects" ? 3 : 2;
    default:
      return 2;
  }
}

export function formatSkillTimeLine(game: GameDef): string {
  const minutes = getEstimatedPlayMinutes(game);
  const L = getGameLearning(game);
  // Skill · mastery stage · time — never XP / Level N / %.
  return `${L.skillName} · ${formatParentMastery(game.id)} · ~${minutes} min`;
}

/** Compact chip when space is tight (strips). */
export function formatSkillTimeShort(game: GameDef): string {
  const L = getGameLearning(game);
  return `${L.skillName} · ${formatParentMastery(game.id)}`;
}

/** Map existing accuracy % → 0–3 stars (display only; not XP). */
export function skillStarsFromPercent(pct: number, hasAttempts: boolean): number {
  if (!hasAttempts) return 0;
  if (pct >= 75) return 3;
  if (pct >= 40) return 2;
  return 1;
}

/** Soft level 0–5 from accuracy — visual only, no XP storage. */
export function skillLevelFromPercent(pct: number, hasAttempts: boolean): number {
  if (!hasAttempts) return 0;
  return Math.min(5, Math.max(1, Math.ceil(pct / 20)));
}

/** Recently played games the child can still open — Continue strip. */
export function getContinuePlayingGames(isPremium: boolean, limit = 6): GameDef[] {
  const log = getPlayLog();
  const seen = new Set<string>();
  const out: GameDef[] = [];
  for (const entry of log) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const game = GAMES.find((g) => g.id === entry.id);
    if (!game || !canPlayGame(game, isPremium)) continue;
    out.push(game);
    if (out.length >= limit) break;
  }
  return out;
}

/** Next-best skill game for result CTA — never “Play again” as primary. */
export function getNextBestSkillGame(
  isPremium: boolean,
  excludeIds: readonly string[] = [],
): GameDef | undefined {
  return getRecommendedGames(isPremium, excludeIds, 1)[0];
}

export function getNextBestSkillCue(game: GameDef | undefined): string {
  if (!game) return "Try a gentle next skill";
  return nextSkillCue(getPracticeSkillFamily(game.id));
}

/** Amy pick + weakest mastery families — Recommended strip. */
export function getRecommendedGames(
  isPremium: boolean,
  excludeIds: readonly string[] = [],
  limit = 6,
): GameDef[] {
  const exclude = new Set(excludeIds);
  const out: GameDef[] = [];
  const push = (game: GameDef | undefined) => {
    if (!game || exclude.has(game.id) || !canPlayGame(game, isPremium)) return;
    out.push(game);
    exclude.add(game.id);
  };

  const weakFamilies = getWeakestPracticeFamilies(4);
  for (const family of weakFamilies) {
    const match = GAMES.find(
      (g) => getPracticeSkillFamily(g.id) === family && canPlayGame(g, isPremium) && !exclude.has(g.id),
    );
    push(match);
    if (out.length >= limit) return out;
  }

  const suggestion = amySuggestion(isPremium);
  if (suggestion.gameId) {
    push(GAMES.find((g) => g.id === suggestion.gameId));
  }

  const skills = getSkills();
  const ranked = GAMES.filter((g) => canPlayGame(g, isPremium) && !exclude.has(g.id)).sort((a, b) => {
    const sa = skills[a.category]?.attempts
      ? skills[a.category].correct / skills[a.category].attempts
      : 0;
    const sb = skills[b.category]?.attempts
      ? skills[b.category].correct / skills[b.category].attempts
      : 0;
    return sa - sb;
  });

  for (const game of ranked) {
    push(game);
    if (out.length >= limit) break;
  }
  return out;
}

const HERO_LINES: Record<GameCategory, string> = {
  brain: "Let's solve today's puzzle!",
  memory: "Ready to train your memory?",
  math: "Quick math adventure — you've got this!",
  focus: "Spot it, tap it — let's focus!",
  creativity: "Time to make something colourful!",
  behavior: "Amy picked a kind-choice adventure.",
  action: "Ready for today's action challenge?",
  puzzle: "Ready for today's adventure?",
};

export function getHeroMotivation(game: GameDef | undefined): string {
  if (!game) return "Ready for today's adventure?";
  return HERO_LINES[game.category] ?? "Amy picked this game for you.";
}

export function getAdventureGame(isPremium: boolean): GameDef | undefined {
  const suggested = amySuggestion(isPremium);
  if (suggested.gameId) {
    const g = GAMES.find((x) => x.id === suggested.gameId);
    if (g && canPlayGame(g, isPremium)) return g;
  }
  return GAMES.find((g) => canPlayGame(g, isPremium));
}
