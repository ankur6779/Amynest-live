// Gaming Reward — AsyncStorage port of the web lib/games.ts
// All functions are async because AsyncStorage is async.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mutatePoints, getTotalPoints as getPointsShared, withPointsLock } from "./rewardsStorage";

export type GameCategory =
  | "brain" | "memory" | "math" | "focus" | "creativity" | "behavior" | "action";

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
}

export const GAMES: GameDef[] = [
  // Brain & Logic
  { id: "pattern-match",  title: "Pattern Match",    category: "brain",    emoji: "🧩", blurb: "Spot the next shape in the pattern.",     unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  { id: "odd-one-out",    title: "Odd One Out",      category: "brain",    emoji: "🔍", blurb: "Find the one that doesn't belong.",        unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  // Memory
  { id: "card-flip",      title: "Card Flip Match",  category: "memory",   emoji: "🃏", blurb: "Flip and match the pairs.",                unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "4+" },
  { id: "color-memory",   title: "Color Memory",     category: "memory",   emoji: "🎨", blurb: "Watch the colours, then recall in order.", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  // Math & Learning
  { id: "speed-math",     title: "Speed Math",       category: "math",     emoji: "➕", blurb: "Solve quick sums against the clock.",      unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "6+" },
  { id: "number-match",   title: "Number Match",     category: "math",     emoji: "🔢", blurb: "Match the number to the count of dots.",   unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "4+" },
  // Focus & Observation
  { id: "find-mistake",   title: "Find the Mistake", category: "focus",    emoji: "🕵️", blurb: "Spot the wrong character in the row.",     unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "6+" },
  // Action & Coordination
  { id: "target-tap",     title: "Target Tap",       category: "action",   emoji: "🎯", blurb: "Tap targets before they vanish.",          unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready", ageHint: "5+" },
  // Behavior (USP)
  { id: "what-should-you-do", title: "What Should You Do?", category: "behavior", emoji: "💛", blurb: "Pick the kind, smart choice in real situations.", unlockCost: 50, rewardMin: 8, rewardMax: 15, status: "ready", ageHint: "6+" },
  // Action & Creativity (newly implemented)
  { id: "maze-escape",         title: "Maze Escape",         category: "action",      emoji: "🗺️", blurb: "Guide the dot out of the maze.",            unlockCost: 60, rewardMin: 5,  rewardMax: 12, status: "ready", ageHint: "5+" },
  { id: "color-fill",          title: "Color Fill",          category: "creativity",  emoji: "🖍️", blurb: "Fill the picture with the right colours.",  unlockCost: 60, rewardMin: 5,  rewardMax: 12, status: "ready", ageHint: "4+" },
  { id: "sequence-memory",     title: "Sequence Memory",     category: "memory",      emoji: "🔮", blurb: "Remember and repeat the colour sequence.",  unlockCost: 60, rewardMin: 5,  rewardMax: 15, status: "ready", ageHint: "4+" },
  { id: "shape-matching",      title: "Shape Matching",      category: "brain",       emoji: "🔷", blurb: "Match each shape to its correct label.",    unlockCost: 50, rewardMin: 5,  rewardMax: 15, status: "ready", ageHint: "4+" },
  { id: "hidden-objects",      title: "Hidden Objects",      category: "focus",       emoji: "🔎", blurb: "Find the hidden items in the scene.",       unlockCost: 50, rewardMin: 5,  rewardMax: 15, status: "ready", ageHint: "4+" },
  { id: "spot-the-difference", title: "Spot the Difference", category: "focus",       emoji: "👀", blurb: "Find what changed between two pictures.",  unlockCost: 60, rewardMin: 8,  rewardMax: 15, status: "ready", ageHint: "5+" },
];

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  brain: "Brain & Logic", memory: "Memory", math: "Math & Learning",
  focus: "Focus", creativity: "Creativity", behavior: "Behavior", action: "Action",
};

export const CATEGORY_EMOJI: Record<GameCategory, string> = {
  brain: "🧠", memory: "💭", math: "🔢", focus: "👁️",
  creativity: "🎨", behavior: "💛", action: "🎯",
};

// ── Keys ──────────────────────────────────────────────────────
const KEY_POINTS   = "amynest_points";
const KEY_UNLOCKED = "amynest_unlocked_games_v1";
const KEY_PLAYS    = "amynest_game_play_log_v1";
const KEY_SKILLS   = "amynest_skill_progress_v1";
const DAILY_LIMIT  = 3;

// ── Points ──────────────────────────────────────────────────
// Reads/writes are serialized by the shared lock in `rewardsStorage` so concurrent
// game unlocks, plays, and redemptions can't lose updates to the shared balance.
export async function getTotalPoints(): Promise<number> {
  return getPointsShared();
}

// ── Unlocked games ──────────────────────────────────────────
export async function getUnlocked(): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY_UNLOCKED)) ?? "[]"); } catch { return []; }
}
export async function isUnlocked(id: string): Promise<boolean> {
  return (await getUnlocked()).includes(id);
}
export async function unlockGame(id: string): Promise<{ ok: boolean; reason?: string }> {
  const game = GAMES.find(g => g.id === id);
  if (!game) return { ok: false, reason: "Game not found." };
  // Run the entire check-and-act (read points, read unlocked list, charge,
  // append unlocked id) inside the shared points lock so concurrent unlock
  // calls — for the same id or different ids — can never double-charge or
  // clobber the unlocked list.
  return withPointsLock(async () => {
    const unlocked = await getUnlocked();
    if (unlocked.includes(id)) return { ok: true }; // idempotent: already unlocked, no charge
    const ptsRaw = await AsyncStorage.getItem(KEY_POINTS);
    const pts = parseInt(ptsRaw ?? "0", 10) || 0;
    if (pts < game.unlockCost) {
      return { ok: false, reason: `You need ${game.unlockCost} pts (have ${pts}).` };
    }
    await AsyncStorage.setItem(KEY_POINTS, String(pts - game.unlockCost));
    await AsyncStorage.setItem(KEY_UNLOCKED, JSON.stringify([...unlocked, id]));
    return { ok: true };
  });
}

// ── Play log / daily limit ───────────────────────────────────
interface PlayEntry { id: string; date: string; pointsEarned: number; perfect: boolean; score: number; total: number }
function todayStr() { return new Date().toISOString().slice(0, 10); }
async function getPlayLog(): Promise<PlayEntry[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY_PLAYS)) ?? "[]"); } catch { return []; }
}
export async function gamesPlayedToday(): Promise<number> {
  const today = todayStr();
  return (await getPlayLog()).filter(e => e.date.startsWith(today)).length;
}
export async function dailyLimitReached(): Promise<boolean> {
  return (await gamesPlayedToday()) >= DAILY_LIMIT;
}
export const DAILY_LIMIT_N = DAILY_LIMIT;

// ── Record play ──────────────────────────────────────────────
export async function recordPlay(id: string, score: number, total: number, perfect: boolean, pointsEarned: number) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(score)));

  const log = await getPlayLog();
  log.unshift({ id, date: new Date().toISOString(), pointsEarned, perfect, score: safeScore, total: safeTotal });
  await AsyncStorage.setItem(KEY_PLAYS, JSON.stringify(log.slice(0, 200)));

  await mutatePoints((pts) => pts + pointsEarned);

  // Skill tracking
  const game = GAMES.find(g => g.id === id);
  if (game) {
    const raw = await AsyncStorage.getItem(KEY_SKILLS);
    const skills: Record<string, { attempts: number; correct: number }> =
      raw ? JSON.parse(raw) : {};
    const s = skills[game.category] ?? { attempts: 0, correct: 0 };
    s.attempts += safeTotal;
    s.correct  += safeScore;
    skills[game.category] = s;
    await AsyncStorage.setItem(KEY_SKILLS, JSON.stringify(skills));
  }
}

// ── Skill percent ────────────────────────────────────────────
export async function getSkillPercents(): Promise<Record<GameCategory, number>> {
  const cats: GameCategory[] = ["brain","memory","math","focus","creativity","behavior","action"];
  const defaults = Object.fromEntries(cats.map(c => [c, 0])) as Record<GameCategory, number>;
  try {
    const raw = await AsyncStorage.getItem(KEY_SKILLS);
    if (!raw) return defaults;
    const skills = JSON.parse(raw);
    for (const cat of cats) {
      const s = skills[cat];
      if (s?.attempts > 0) defaults[cat] = Math.max(0, Math.min(100, Math.round(s.correct / s.attempts * 100)));
    }
  } catch { /* ignore */ }
  return defaults;
}

// ── Amy suggestion ───────────────────────────────────────────
export async function amySuggestion(): Promise<{ gameId: string | null; line: string }> {
  const unlocked = await getUnlocked();
  const playable = GAMES.filter(g => g.status === "ready" && unlocked.includes(g.id));
  if (!playable.length) return { gameId: null, line: "Earn 50 points from your routines to unlock your first game." };
  const lines: Record<GameCategory, string> = {
    behavior: `Try '${playable[0].title}' — builds calm, kind decision-making.`,
    memory: "A memory game today improves focus and working memory.",
    math: "Try a math game to build mental-math speed.",
    brain: "Warm up with a brain game — helps reading and maths.",
    focus: "Sharpen focus with an observation game.",
    creativity: "Get creative with a colour or shape game.",
    action: "Sharpen reaction time with an action game.",
  };
  const pick = playable[0];
  return { gameId: pick.id, line: `Amy AI Suggests: ${lines[pick.category]}` };
}
