// Gaming Reward — unlock + daily-limit + skill-tracking, layered on lib/rewards.ts.
import { getTotalPoints } from "./rewards";

export type GameCategory =
  | "brain" | "memory" | "math" | "focus" | "creativity" | "behavior" | "action" | "puzzle";

export interface GameDef {
  id: string;
  title: string;
  category: GameCategory;
  emoji: string;
  blurb: string;
  unlockCost: number;        // points needed to unlock the FIRST time
  rewardMin: number;         // points awarded for completion
  rewardMax: number;         // bonus on perfect score
  status: "ready" | "soon";
  ageHint?: string;
}

export const GAMES: GameDef[] = [
  // ── Brain & Logic ───────────────────────────────────────────
  { id: "pattern-match",    title: "Pattern Match",    category: "brain",     emoji: "🧩", blurb: "Spot the next shape in the pattern.",          unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  { id: "odd-one-out",      title: "Odd One Out",      category: "brain",     emoji: "🔍", blurb: "Find the one that does not belong.",           unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  // ── Memory ──────────────────────────────────────────────────
  { id: "card-flip",        title: "Card Flip Match",  category: "memory",    emoji: "🃏", blurb: "Flip and match the pairs.",                    unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "4+" },
  { id: "sequence",         title: "Sequence Memory",  category: "memory",    emoji: "🎵", blurb: "Repeat the colour sequence.",                  unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  { id: "color-memory",     title: "Color Memory",     category: "memory",    emoji: "🎨", blurb: "Watch the colours, then recall in order.",     unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  // ── Math & Learning ─────────────────────────────────────────
  { id: "speed-math",       title: "Speed Math",       category: "math",      emoji: "➕", blurb: "Solve quick sums against the clock.",          unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "6+" },
  { id: "number-match",     title: "Number Match",     category: "math",      emoji: "🔢", blurb: "Match the number to the count of dots.",       unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "4+" },
  // ── Focus & Observation ─────────────────────────────────────
  { id: "find-mistake",     title: "Find the Mistake", category: "focus",     emoji: "🕵️", blurb: "Spot the wrong character in a row.",           unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "6+" },
  // ── Action & Coordination ───────────────────────────────────
  { id: "target-tap",       title: "Target Tap",       category: "action",    emoji: "🎯", blurb: "Tap targets before they vanish.",              unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  // ── Behavior (USP) ──────────────────────────────────────────
  { id: "what-should-you-do", title: "What Should You Do?", category: "behavior", emoji: "💛", blurb: "Pick the kind, smart choice in real-life situations.", unlockCost: 50, rewardMin: 8, rewardMax: 15, status: "ready", ageHint: "6+" },
  // ── Coming soon ─────────────────────────────────────────────
  { id: "spot-difference",  title: "Spot the Difference", category: "focus",     emoji: "👀", blurb: "Find what changed between two pictures.",  unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
  { id: "hidden-objects",   title: "Hidden Objects",      category: "focus",     emoji: "🔭", blurb: "Find hidden items in the scene.",          unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
  { id: "color-fill",       title: "Color Fill",          category: "creativity",emoji: "🖍️", blurb: "Fill the picture with the right colours.", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
  { id: "shape-match",      title: "Shape Matching",      category: "creativity",emoji: "🔷", blurb: "Drag shapes into matching slots.",         unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
  { id: "maze-escape",      title: "Maze Escape",         category: "action",    emoji: "🗺️", blurb: "Guide the dot out of the maze.",           unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
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

const UNLOCKED_KEY  = "amynest_unlocked_games_v1";
const PLAY_LOG_KEY  = "amynest_game_play_log_v1";
const SKILLS_KEY    = "amynest_skill_progress_v1";
const DAILY_LIMIT   = 15;

export function getUnlocked(): string[] {
  try { return JSON.parse(localStorage.getItem(UNLOCKED_KEY) ?? "[]"); } catch { return []; }
}
export function isUnlocked(id: string): boolean {
  return getUnlocked().includes(id);
}

export function unlockGame(id: string): { ok: boolean; reason?: string } {
  const game = GAMES.find((g) => g.id === id);
  if (!game) return { ok: false, reason: "Game not found." };
  if (isUnlocked(id)) return { ok: true };
  const points = getTotalPoints();
  if (points < game.unlockCost) {
    return { ok: false, reason: `You need ${game.unlockCost} points to unlock this game (you have ${points}).` };
  }
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
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(list));
  return { ok: true };
}

interface PlayEntry { id: string; date: string; pointsEarned: number; perfect: boolean; score?: number; total?: number }

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getPlayLog(): PlayEntry[] {
  try { return JSON.parse(localStorage.getItem(PLAY_LOG_KEY) ?? "[]"); } catch { return []; }
}

export function gamesPlayedToday(): number {
  const today = todayStr();
  return getPlayLog().filter((e) => e.date.startsWith(today)).length;
}
export function dailyLimit(): number { return DAILY_LIMIT; }
export function dailyLimitReached(): boolean { return gamesPlayedToday() >= DAILY_LIMIT; }

// ── Skill Tracking ───────────────────────────────────────────
type SkillRecord = Record<GameCategory, { attempts: number; correct: number; plays: number }>;

function emptySkills(): SkillRecord {
  return {
    brain:      { attempts: 0, correct: 0, plays: 0 },
    memory:     { attempts: 0, correct: 0, plays: 0 },
    math:       { attempts: 0, correct: 0, plays: 0 },
    focus:      { attempts: 0, correct: 0, plays: 0 },
    creativity: { attempts: 0, correct: 0, plays: 0 },
    behavior:   { attempts: 0, correct: 0, plays: 0 },
    action:     { attempts: 0, correct: 0, plays: 0 },
    puzzle:     { attempts: 0, correct: 0, plays: 0 },
  };
}

export function getSkills(): SkillRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(SKILLS_KEY) ?? "null");
    if (!raw) return emptySkills();
    return { ...emptySkills(), ...raw };
  } catch { return emptySkills(); }
}

/** Returns 0-100 % accuracy across all attempts in a category. */
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

  // Wallet update (inline to avoid circular import)
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

  // Skill tracking — clamp inputs so any game-side bug can't corrupt aggregates
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

// ── Amy AI Suggestion ────────────────────────────────────────
export function amySuggestion(): { gameId: string | null; line: string } {
  const unlocked = getUnlocked();
  const playable = GAMES.filter((g) => g.status === "ready" && unlocked.includes(g.id));
  if (playable.length === 0) {
    return { gameId: null, line: "Earn 50 points from your routines to unlock your first game." };
  }
  // Suggest the category with the LOWEST skill % (room to grow), tie-break by priority
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
    behavior:   `Try '${pick.title}' — it builds the kind, calm choice-making muscle.`,
    memory:     `A memory game like '${pick.title}' improves focus and working memory.`,
    brain:      `Warm up the brain with '${pick.title}' — pattern thinking helps maths and reading.`,
    math:       `Try '${pick.title}' to build mental-math speed and confidence.`,
    focus:      `Try '${pick.title}' to sharpen focus and visual attention.`,
    creativity: `Get creative with '${pick.title}'.`,
    action:     `Sharpen reflexes with '${pick.title}'.`,
    puzzle:     `Build problem-solving with '${pick.title}'.`,
  };
  return { gameId: pick.id, line: `Amy AI Suggests: ${lines[pick.category]}` };
}
