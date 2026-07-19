// Gaming Hub — unlock + daily-limit + skill-tracking, layered on lib/rewards.ts.
import {
  sanitizeLeaderboardLog,
  sanitizePlayLog,
  sanitizeSkillRecord,
  sanitizeUnlockedGames,
} from "./game-storage-sanitize";
import { getTotalPoints } from "./rewards";
import { canUnlockGameWithStreak, getCachedRoutineStreak, STREAK_UNLOCK_DAYS } from "./routine-streak-cache";

export type GameCategory =
  | "brain" | "memory" | "math" | "focus" | "creativity" | "behavior" | "action" | "puzzle";

export interface GameDef {
  id: string;
  title: string;
  category: GameCategory;
  emoji: string;
  blurb: string;
  unlockCost: number;
  rewardMin: number;
  rewardMax: number;
  status: "ready" | "soon";
  ageHint?: string;
  /** Requires premium subscription to play (free users see upgrade). */
  premiumOnly?: boolean;
}

/** Always playable for free users (no point unlock required). */
export const FREE_STARTER_GAME_IDS = ["pattern-match", "what-should-you-do"] as const;

export const DAILY_LIMIT_FREE = 3;
export const DAILY_LIMIT_PREMIUM = 12;

export const GAMES: GameDef[] = [
  { id: "pattern-match",    title: "Pattern Match",    category: "brain",     emoji: "🧩", blurb: "What comes next in the pattern?",              unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 5–8" },
  { id: "odd-one-out",      title: "Odd One Out",      category: "brain",     emoji: "🔍", blurb: "Which one does not belong?",                   unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 5–8" },
  { id: "card-flip",        title: "Card Flip Match",  category: "memory",    emoji: "🃏", blurb: "Flip cards and find matching pairs.",          unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 4–7" },
  { id: "sequence",         title: "Sequence Memory",  category: "memory",    emoji: "🎵", blurb: "Watch the colours, then tap them in order.",   unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 5–8" },
  { id: "color-memory",     title: "Color Memory",     category: "memory",    emoji: "🎨", blurb: "Remember the colour order and tap it back.",   unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 5–8" },
  { id: "speed-math",       title: "Speed Math",       category: "math",      emoji: "➕", blurb: "Solve friendly sums — start on Easy if new.", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 6–8" },
  { id: "number-match",     title: "Number Match",     category: "math",      emoji: "🔢", blurb: "Count the dots, then tap the number.",         unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 3–6" },
  { id: "find-mistake",     title: "Find the Mistake", category: "focus",     emoji: "🕵️", blurb: "Look carefully — tap the different one.",     unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 6–8" },
  { id: "target-tap",       title: "Target Tap",       category: "action",    emoji: "🎯", blurb: "Tap the glowing targets when you see them.",   unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "Ages 5–8" },
  { id: "what-should-you-do", title: "What Should You Do?", category: "behavior", emoji: "💛", blurb: "Pick the kindest choice in real-life moments.", unlockCost: 50, rewardMin: 8, rewardMax: 15, status: "ready", ageHint: "Ages 6–8" },
  { id: "spot-difference",  title: "Spot the Difference", category: "focus",     emoji: "👀", blurb: "Compare two pictures — tap what changed.", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", premiumOnly: true, ageHint: "Ages 6–8" },
  { id: "hidden-objects",   title: "Hidden Objects",      category: "focus",     emoji: "🔭", blurb: "Find each listed item hiding in the scene.", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", premiumOnly: true, ageHint: "Ages 5–8" },
  { id: "color-fill",       title: "Color Fill",          category: "creativity",emoji: "🖍️", blurb: "Fill cells to match the colour picture.", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", ageHint: "Ages 4–7" },
  { id: "shape-match",      title: "Shape Matching",      category: "creativity",emoji: "🔷", blurb: "Pick a shape, then tap its name.",        unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", ageHint: "Ages 3–6" },
  { id: "maze-escape",      title: "Maze Escape",         category: "action",    emoji: "🗺️", blurb: "Plan a path and guide your friend out.",  unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", ageHint: "Ages 5–8" },
];

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  brain:      "Brain & Logic",
  memory:     "Memory",
  math:       "Math & Learning",
  focus:      "Focus & Observation",
  creativity: "Creativity",
  behavior:   "Behavior & Decision",
  action:     "Action & Coordination",
  puzzle:     "Puzzle",
};

export const CATEGORY_EMOJI: Record<GameCategory, string> = {
  brain: "🧠", memory: "💭", math: "🔢", focus: "👁️",
  creativity: "🎨", behavior: "💛", action: "🎯", puzzle: "🧩",
};

export const CATEGORY_BLURB: Record<GameCategory, string> = {
  brain: "Flexible thinking & patterns",
  memory: "Working memory & recall",
  math: "Number sense & counting",
  focus: "Attention & careful looking",
  creativity: "Shapes, colour & matching",
  behavior: "Kind choices & self-control",
  action: "Planning, timing & coordination",
  puzzle: "Problem-solving play",
};

const UNLOCKED_KEY  = "amynest_unlocked_games_v1";
const PLAY_LOG_KEY  = "amynest_game_play_log_v1";
const SKILLS_KEY    = "amynest_skill_progress_v1";
const PERFECT_STREAK_KEY = "amynest_perfect_streak_v1";
const LEADERBOARD_KEY = "amynest_game_leaderboard_v1";

export const PERFECT_COMBO_BADGE_AT = 3;

export function isFreeStarter(id: string): boolean {
  return (FREE_STARTER_GAME_IDS as readonly string[]).includes(id);
}

export function dailyLimit(isPremium = false): number {
  return isPremium ? DAILY_LIMIT_PREMIUM : DAILY_LIMIT_FREE;
}

export function getUnlocked(): string[] {
  try {
    return sanitizeUnlockedGames(JSON.parse(localStorage.getItem(UNLOCKED_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function isUnlocked(id: string): boolean {
  return getUnlocked().includes(id);
}

/** Free starters are treated as unlocked for play. Premium unlocks the full catalog. */
export function isGameUnlockedForPlay(id: string, isPremium = false): boolean {
  if (isPremium) return true;
  if (isFreeStarter(id)) return true;
  return isUnlocked(id);
}

export function requiresPremiumToPlay(game: GameDef): boolean {
  return !!game.premiumOnly;
}

export function canPlayGame(game: GameDef, isPremium = false): boolean {
  if (game.status !== "ready") return false;
  if (game.premiumOnly && !isPremium) return false;
  return isGameUnlockedForPlay(game.id, isPremium);
}

function persistUnlocked(list: string[]): void {
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(list));
}

/** Ensures free starter games appear in the unlocked list for ledger consistency. */
export function ensureStarterUnlocks(): void {
  const list = getUnlocked();
  let changed = false;
  for (const id of FREE_STARTER_GAME_IDS) {
    if (!list.includes(id)) {
      list.push(id);
      changed = true;
    }
  }
  if (changed) persistUnlocked(list);
}

export function unlockGame(
  id: string,
  opts?: { isPremium?: boolean },
): { ok: boolean; reason?: string; via?: "points" | "streak" | "premium" | "starter" } {
  const isPremium = opts?.isPremium ?? false;
  const game = GAMES.find((g) => g.id === id);
  if (!game) return { ok: false, reason: "Game not found." };
  if (game.premiumOnly && !isPremium) {
    return { ok: false, reason: "This game is included with Premium." };
  }
  if (isGameUnlockedForPlay(id, isPremium)) {
    return { ok: true, via: isPremium ? "premium" : isFreeStarter(id) ? "starter" : undefined };
  }

  if (isPremium) {
    const list = getUnlocked();
    if (!list.includes(id)) list.push(id);
    persistUnlocked(list);
    return { ok: true, via: "premium" };
  }

  if (isFreeStarter(id)) {
    const list = getUnlocked();
    if (!list.includes(id)) list.push(id);
    persistUnlocked(list);
    return { ok: true, via: "starter" };
  }

  const points = getTotalPoints();
  if (points >= game.unlockCost) {
    const remaining = points - game.unlockCost;
    localStorage.setItem("amynest_points", String(remaining));
    const ledger = JSON.parse(localStorage.getItem("amynest_ledger") ?? "[]");
    ledger.unshift({
      date: new Date().toISOString(),
      childName: "Game Unlock",
      activity: `Unlocked: ${game.title}`,
      points: -game.unlockCost,
    });
    localStorage.setItem("amynest_ledger", JSON.stringify(ledger.slice(0, 50)));
    const list = getUnlocked();
    list.push(id);
    persistUnlocked(list);
    return { ok: true, via: "points" };
  }

  if (canUnlockGameWithStreak()) {
    const list = getUnlocked();
    list.push(id);
    persistUnlocked(list);
    const ledger = JSON.parse(localStorage.getItem("amynest_ledger") ?? "[]");
    ledger.unshift({
      date: new Date().toISOString(),
      childName: "Game Unlock",
      activity: `Streak unlock (${STREAK_UNLOCK_DAYS} days): ${game.title}`,
      points: 0,
    });
    localStorage.setItem("amynest_ledger", JSON.stringify(ledger.slice(0, 50)));
    return { ok: true, via: "streak" };
  }

  const streak = getCachedRoutineStreak();
  return {
    ok: false,
    reason: `Need ${game.unlockCost} points (you have ${points}), or a ${STREAK_UNLOCK_DAYS}-day routine streak (current: ${streak} days).`,
  };
}

interface PlayEntry { id: string; date: string; pointsEarned: number; perfect: boolean; score?: number; total?: number }

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function getPlayLog(): PlayEntry[] {
  try {
    return sanitizePlayLog(JSON.parse(localStorage.getItem(PLAY_LOG_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function gamesPlayedToday(): number {
  const today = todayStr();
  return getPlayLog().filter((e) => e.date.slice(0, 10) === today).length;
}

export function dailyLimitReached(isPremium = false): boolean {
  return gamesPlayedToday() >= dailyLimit(isPremium);
}

export interface WeeklyGameSummary {
  playsLast7Days: number;
  perfectCount: number;
  pointsEarned: number;
  topCategory: GameCategory | null;
  categoryAccuracies: { cat: GameCategory; pct: number }[];
}

export function getWeeklyGameSummary(): WeeklyGameSummary {
  const since = daysAgoISO(6);
  const log = getPlayLog().filter((e) => e.date.slice(0, 10) >= since);
  const skills = getSkills();
  const skillCats: GameCategory[] = ["brain", "memory", "math", "focus", "behavior", "action", "creativity"];
  const categoryAccuracies = skillCats
    .map((cat) => ({ cat, pct: getSkillPercent(cat) }))
    .filter((x) => skills[x.cat]?.attempts > 0)
    .sort((a, b) => b.pct - a.pct);

  return {
    playsLast7Days: log.length,
    perfectCount: log.filter((e) => e.perfect).length,
    pointsEarned: log.reduce((sum, e) => sum + e.pointsEarned, 0),
    topCategory: categoryAccuracies[0]?.cat ?? null,
    categoryAccuracies,
  };
}

type SkillRecord = Record<GameCategory, { attempts: number; correct: number; plays: number }>;

export function getSkills(): SkillRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(SKILLS_KEY) ?? "null");
    return sanitizeSkillRecord(raw);
  } catch {
    return sanitizeSkillRecord(null);
  }
}

export function getSkillPercent(cat: GameCategory): number {
  const s = getSkills()[cat];
  if (!s || s.attempts === 0) return 0;
  const pct = Math.round((s.correct / s.attempts) * 100);
  return Math.max(0, Math.min(100, pct));
}

export function recordPlay(id: string, score: number, total: number, perfect: boolean, pointsEarned: number): void {
  const log = getPlayLog();
  log.unshift({ id, date: new Date().toISOString(), pointsEarned, perfect, score, total });
  localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(log.slice(0, 200)));

  const current = parseInt(localStorage.getItem("amynest_points") ?? "0", 10);
  localStorage.setItem("amynest_points", String(current + pointsEarned));
  const ledger = JSON.parse(localStorage.getItem("amynest_ledger") ?? "[]");
  const game = GAMES.find((g) => g.id === id);
  ledger.unshift({
    date: new Date().toISOString(),
    childName: "Game Play",
    activity: `${game?.title ?? id}${perfect ? " — Perfect!" : ""}`,
    points: pointsEarned,
  });
  localStorage.setItem("amynest_ledger", JSON.stringify(ledger.slice(0, 50)));

  if (game) {
    const safeTotal = Math.max(1, Math.floor(total));
    const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(score)));
    const skills = getSkills();
    const s = skills[game.category];
    s.attempts += safeTotal;
    s.correct  += safeScore;
    s.plays    += 1;
    skills[game.category] = s;
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  }
}

export function amySuggestion(isPremium = false): { gameId: string | null; line: string } {
  ensureStarterUnlocks();
  const playable = GAMES.filter((g) => g.status === "ready" && canPlayGame(g, isPremium));
  if (playable.length === 0) {
    if (!isPremium) {
      return {
        gameId: null,
        line: "Unlock Pattern Match and What Should You Do? free — earn 50 points or keep a 5-day routine streak for more.",
      };
    }
    return { gameId: null, line: "Earn 50 points from your routines to unlock your first game." };
  }
  const skills = getSkills();
  const pri: GameCategory[] = ["behavior", "memory", "math", "brain", "focus", "action"];
  playable.sort((a, b) => {
    const sa = skills[a.category]?.attempts ? skills[a.category].correct / skills[a.category].attempts : 0;
    const sb = skills[b.category]?.attempts ? skills[b.category].correct / skills[b.category].attempts : 0;
    if (sa !== sb) return sa - sb;
    return pri.indexOf(a.category) - pri.indexOf(b.category);
  });
  const pick = playable[0];
  const lines: Record<GameCategory, string> = {
    behavior:   `Try '${pick.title}' — practise kind choices and calm thinking.`,
    memory:     `'${pick.title}' gently trains working memory — great for following steps.`,
    brain:      `'${pick.title}' builds pattern thinking that helps maths and reading later.`,
    math:       `'${pick.title}' grows number confidence — start Easy if it feels new.`,
    focus:      `'${pick.title}' strengthens careful looking and attention stamina.`,
    creativity: `'${pick.title}' links shapes and colours with calm matching play.`,
    action:     `'${pick.title}' practises planning and controlled movement.`,
    puzzle:     `'${pick.title}' grows problem-solving through playful challenge.`,
  };
  return { gameId: pick.id, line: `Amy suggests: ${lines[pick.category]}` };
}

// ── Perfect streak combo ──────────────────────────────────────────────────────

export function getPerfectStreak(): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(PERFECT_STREAK_KEY) ?? "0", 10));
  } catch {
    return 0;
  }
}

export function recordPerfectStreak(perfect: boolean): number {
  const next = perfect ? getPerfectStreak() + 1 : 0;
  localStorage.setItem(PERFECT_STREAK_KEY, String(next));
  return next;
}

export function hasPerfectComboBadge(): boolean {
  return getPerfectStreak() >= PERFECT_COMBO_BADGE_AT;
}

// ── Weekly leaderboard (local, premium-gated in UI) ───────────────────────────

export interface LeaderboardEntry {
  gameId: string;
  score: number;
  total: number;
  ratio: number;
  date: string;
}

export function getLeaderboardLog(): LeaderboardEntry[] {
  try {
    return sanitizeLeaderboardLog(JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function recordLeaderboardEntry(gameId: string, score: number, total: number): void {
  const safeTotal = Math.max(1, total);
  const safeScore = Math.max(0, Math.min(safeTotal, score));
  const ratio = safeScore / safeTotal;
  const log = getLeaderboardLog();
  log.unshift({
    gameId,
    score: safeScore,
    total: safeTotal,
    ratio,
    date: new Date().toISOString(),
  });
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(log.slice(0, 400)));
}

export interface WeeklyLeaderboardRow {
  gameId: string;
  game: GameDef;
  bestRatio: number;
  bestScore: number;
  bestTotal: number;
  plays: number;
}

export interface GamePersonalBest {
  ratio: number;
  plays: number;
  lastPlayedAt: string | null;
}

export function getGamePersonalBest(gameId: string): GamePersonalBest | null {
  const log = getLeaderboardLog().filter((e) => e.gameId === gameId);
  if (log.length === 0) return null;
  const best = log.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  return {
    ratio: Math.round(best.ratio * 100),
    plays: log.length,
    lastPlayedAt: log[0]?.date ?? null,
  };
}

export function getWeeklyLeaderboard(): WeeklyLeaderboardRow[] {
  const since = daysAgoISO(6);
  const log = getLeaderboardLog().filter((e) => e.date.slice(0, 10) >= since);
  const byGame = new Map<string, LeaderboardEntry[]>();
  for (const e of log) {
    if (!byGame.has(e.gameId)) byGame.set(e.gameId, []);
    byGame.get(e.gameId)!.push(e);
  }
  const rows: WeeklyLeaderboardRow[] = [];
  for (const [gameId, entries] of byGame) {
    const game = GAMES.find((g) => g.id === gameId);
    if (!game) continue;
    const best = entries.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    rows.push({
      gameId,
      game,
      bestRatio: Math.round(best.ratio * 100),
      bestScore: best.score,
      bestTotal: best.total,
      plays: entries.length,
    });
  }
  return rows.sort((a, b) => b.bestRatio - a.bestRatio || b.plays - a.plays).slice(0, 8);
}

export interface SkillGapRow {
  cat: GameCategory;
  pct: number;
  label: string;
  emoji: string;
}

export function getSkillGaps(limit = 4): SkillGapRow[] {
  const skillCats: GameCategory[] = ["behavior", "memory", "math", "brain", "focus", "action", "creativity"];
  return skillCats
    .map((cat) => ({
      cat,
      pct: getSkillPercent(cat),
      label: CATEGORY_LABEL[cat].split("&")[0].trim(),
      emoji: CATEGORY_EMOJI[cat],
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, limit);
}

export { STREAK_UNLOCK_DAYS, getCachedRoutineStreak, canUnlockGameWithStreak };
