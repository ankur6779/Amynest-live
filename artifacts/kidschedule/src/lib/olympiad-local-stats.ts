import type { OlympiadDifficulty, OlympiadSubject } from "@workspace/olympiad";
import { SUBJECT_LABELS } from "@workspace/olympiad";

export interface DailyRun {
  picks: string[];
  answers: number[];
  submitted: boolean;
  score: number;
}

export interface DailyHistoryEntry {
  date: string;
  score: number;
  total: number;
  accuracyPct: number;
}

export interface ChildOlympiadStats {
  totalPoints: number;
  difficulty: OlympiadDifficulty;
  streak: number;
  lastDailyDate: string | null;
  perfectDays: number;
  daily: Record<string, DailyRun>;
  weekly: Record<string, DailyRun>;
  bySubject: Record<OlympiadSubject, { correct: number; total: number }>;
  badges: string[];
  /** P2: streak freeze — one skip per calendar week */
  streakFreezesUsedThisWeek: number;
  streakFreezeWeekStart: string | null;
  /** P3/P4: question ids answered incorrectly for review mode */
  mistakeQuestionIds: string[];
  /** P4: last 30 daily runs for charts */
  dailyHistory: DailyHistoryEntry[];
  /** P4: optional daily reminder */
  reminderEnabled: boolean;
  reminderHour: number;
  /** P1: onboarding coach marks done */
  onboardingComplete: boolean;
  /** P4: last server sync timestamp */
  lastSyncedAt: string | null;
  clientUpdatedAt: string | null;
}

export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  check: (s: ChildOlympiadStats) => boolean;
}

const SUBJECTS: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];

export const OLYMPIAD_BADGES: BadgeDef[] = [
  { id: "streak3", emoji: "🔥", label: "3-Day Streak", hint: "Play 3 days in a row", check: (s) => s.streak >= 3 },
  { id: "streak7", emoji: "🔥🔥", label: "7-Day Streak", hint: "Play 7 days in a row", check: (s) => s.streak >= 7 },
  { id: "streak30", emoji: "🔥🔥🔥", label: "30-Day Streak", hint: "Play 30 days in a row", check: (s) => s.streak >= 30 },
  { id: "points100", emoji: "⭐", label: "100 Points", hint: "Earn 100 points", check: (s) => s.totalPoints >= 100 },
  { id: "points500", emoji: "🌟", label: "500 Points", hint: "Earn 500 points", check: (s) => s.totalPoints >= 500 },
  { id: "points1000", emoji: "💎", label: "1000 Points", hint: "Earn 1000 points", check: (s) => s.totalPoints >= 1000 },
  { id: "perfect3", emoji: "🏆", label: "Perfect x3", hint: "Score 5/5 three times", check: (s) => s.perfectDays >= 3 },
  { id: "math50", emoji: "🔢", label: "Math Whiz", hint: "50 correct Math answers", check: (s) => s.bySubject.math.correct >= 50 },
  { id: "science50", emoji: "🔬", label: "Science Star", hint: "50 correct Science answers", check: (s) => s.bySubject.science.correct >= 50 },
  { id: "reasoning50", emoji: "🧩", label: "Reasoning Pro", hint: "50 correct Reasoning answers", check: (s) => s.bySubject.reasoning.correct >= 50 },
  { id: "gk50", emoji: "🌍", label: "GK Guru", hint: "50 correct GK answers", check: (s) => s.bySubject.gk.correct >= 50 },
  { id: "weekly1", emoji: "👑", label: "Weekly Champ", hint: "Complete a weekly test", check: (s) => Object.values(s.weekly).some((w) => w.submitted) },
];

function emptyBySubject(): ChildOlympiadStats["bySubject"] {
  return {
    math: { correct: 0, total: 0 },
    science: { correct: 0, total: 0 },
    reasoning: { correct: 0, total: 0 },
    gk: { correct: 0, total: 0 },
  };
}

export function freshOlympiadStats(): ChildOlympiadStats {
  return {
    totalPoints: 0,
    difficulty: "easy",
    streak: 0,
    lastDailyDate: null,
    perfectDays: 0,
    daily: {},
    weekly: {},
    bySubject: emptyBySubject(),
    badges: [],
    streakFreezesUsedThisWeek: 0,
    streakFreezeWeekStart: null,
    mistakeQuestionIds: [],
    dailyHistory: [],
    reminderEnabled: false,
    reminderHour: 17,
    onboardingComplete: false,
    lastSyncedAt: null,
    clientUpdatedAt: null,
  };
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function sanitizeDaily(raw: unknown): Record<string, DailyRun> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, DailyRun> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const r = v as Partial<DailyRun>;
    out[k] = {
      picks: Array.isArray(r.picks) ? r.picks.filter((x): x is string => typeof x === "string") : [],
      answers: Array.isArray(r.answers) ? r.answers.filter((x): x is number => typeof x === "number") : [],
      submitted: r.submitted === true,
      score: num(r.score),
    };
  }
  return out;
}

export function storageKey(childId: string | number): string {
  return `olympiad:v2:${childId}`;
}

export function loadOlympiadStats(childId: string | number): ChildOlympiadStats {
  const def = freshOlympiadStats();
  if (typeof window === "undefined") return def;
  try {
    const v2 = localStorage.getItem(storageKey(childId));
    const v1 = v2 ? null : localStorage.getItem(`olympiad:v1:${childId}`);
    const raw = v2 ?? v1;
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<ChildOlympiadStats>;
    const bySubject = { ...def.bySubject };
    if (parsed.bySubject && typeof parsed.bySubject === "object") {
      for (const s of SUBJECTS) {
        const e = (parsed.bySubject as Record<string, unknown>)[s] as
          | { correct?: unknown; total?: unknown }
          | undefined;
        bySubject[s] = { correct: num(e?.correct), total: num(e?.total) };
      }
    }
    const difficulty: OlympiadDifficulty =
      parsed.difficulty === "medium" || parsed.difficulty === "hard" || parsed.difficulty === "easy"
        ? parsed.difficulty
        : "easy";
    const dailyHistory = Array.isArray(parsed.dailyHistory)
      ? parsed.dailyHistory.filter(
          (e): e is DailyHistoryEntry =>
            !!e &&
            typeof e === "object" &&
            typeof (e as DailyHistoryEntry).date === "string" &&
            typeof (e as DailyHistoryEntry).score === "number",
        )
      : [];
    return {
      totalPoints: num(parsed.totalPoints),
      difficulty,
      streak: num(parsed.streak),
      lastDailyDate: typeof parsed.lastDailyDate === "string" ? parsed.lastDailyDate : null,
      perfectDays: num(parsed.perfectDays),
      daily: sanitizeDaily(parsed.daily),
      weekly: sanitizeDaily(parsed.weekly),
      bySubject,
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((x): x is string => typeof x === "string") : [],
      streakFreezesUsedThisWeek: num(parsed.streakFreezesUsedThisWeek),
      streakFreezeWeekStart:
        typeof parsed.streakFreezeWeekStart === "string" ? parsed.streakFreezeWeekStart : null,
      mistakeQuestionIds: Array.isArray(parsed.mistakeQuestionIds)
        ? parsed.mistakeQuestionIds.filter((x): x is string => typeof x === "string")
        : [],
      dailyHistory: dailyHistory.slice(-30),
      reminderEnabled: parsed.reminderEnabled === true,
      reminderHour: num(parsed.reminderHour, 17),
      onboardingComplete: parsed.onboardingComplete === true,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
      clientUpdatedAt: typeof parsed.clientUpdatedAt === "string" ? parsed.clientUpdatedAt : null,
    };
  } catch {
    return def;
  }
}

export function saveOlympiadStats(childId: string | number, stats: ChildOlympiadStats): ChildOlympiadStats {
  const stamped = { ...stats, clientUpdatedAt: new Date().toISOString() };
  if (typeof window === "undefined") return stamped;
  try {
    localStorage.setItem(storageKey(childId), JSON.stringify(stamped));
  } catch {
    /* quota */
  }
  return stamped;
}

export function recomputeBadges(s: ChildOlympiadStats): string[] {
  const next = new Set(s.badges);
  for (const b of OLYMPIAD_BADGES) if (b.check(s)) next.add(b.id);
  return Array.from(next);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayBeforeYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function weekStartISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeDailyStreak(
  stats: ChildOlympiadStats,
  date: string,
): { streak: number; usedFreeze: boolean; statsPatch: Partial<ChildOlympiadStats> } {
  const last = stats.lastDailyDate;
  if (last === date) return { streak: stats.streak, usedFreeze: false, statsPatch: {} };
  if (last === yesterdayISO()) return { streak: stats.streak + 1, usedFreeze: false, statsPatch: {} };

  const weekKey = weekStartISO();
  let freezesUsed = stats.streakFreezesUsedThisWeek;
  let freezeWeek = stats.streakFreezeWeekStart;
  if (freezeWeek !== weekKey) {
    freezesUsed = 0;
    freezeWeek = weekKey;
  }

  if (last === dayBeforeYesterdayISO() && freezesUsed < 1 && stats.streak > 0) {
    return {
      streak: stats.streak + 1,
      usedFreeze: true,
      statsPatch: {
        streakFreezesUsedThisWeek: freezesUsed + 1,
        streakFreezeWeekStart: weekKey,
      },
    };
  }

  return { streak: 1, usedFreeze: false, statsPatch: { streakFreezeWeekStart: weekKey, streakFreezesUsedThisWeek: freezesUsed } };
}

export function appendDailyHistory(
  history: DailyHistoryEntry[],
  entry: DailyHistoryEntry,
): DailyHistoryEntry[] {
  const filtered = history.filter((h) => h.date !== entry.date);
  return [...filtered, entry].slice(-30);
}

export function mergeStatsFromServer(
  local: ChildOlympiadStats,
  remote: Partial<ChildOlympiadStats> | null,
  remoteUpdatedAt: string | null,
): ChildOlympiadStats {
  if (!remote) return local;
  const localAt = local.clientUpdatedAt ?? "";
  const remoteAt = remoteUpdatedAt ?? (remote.clientUpdatedAt ?? "");
  if (remoteAt <= localAt) return local;
  const merged = { ...local, ...remote };
  merged.bySubject = { ...local.bySubject, ...(remote.bySubject ?? {}) };
  merged.daily = { ...local.daily, ...(remote.daily ?? {}) };
  merged.weekly = { ...local.weekly, ...(remote.weekly ?? {}) };
  merged.badges = recomputeBadges(merged);
  return merged;
}

/** Merge remote JSON blob from API into typed stats. */
export function parseRemoteStatsBlob(raw: unknown): Partial<ChildOlympiadStats> | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Partial<ChildOlympiadStats>;
}

export function overallAccuracyPct(stats: ChildOlympiadStats): number {
  const totals = Object.values(stats.bySubject);
  const totalAnswered = totals.reduce((a, v) => a + v.total, 0);
  const totalCorrect = totals.reduce((a, v) => a + v.correct, 0);
  return totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);
}

export function collectMistakeIds(
  existing: string[],
  questionIds: string[],
  answers: number[],
  questions: { id: string; correct: number }[],
): string[] {
  const wrong = questionIds.filter((id, i) => answers[i] !== questions[i]?.correct);
  const set = new Set([...existing, ...wrong]);
  return [...set].slice(-100);
}

export function buildAmyInsightTemplate(stats: ChildOlympiadStats, childName: string): string {
  const subjEntries = (Object.entries(stats.bySubject) as [OlympiadSubject, { correct: number; total: number }][]).filter(
    ([, v]) => v.total >= 3,
  );
  if (subjEntries.length === 0) {
    return `${childName} is just getting started. Try the Daily 5 today and Amy will share insights as scores come in.`;
  }
  const withAcc = subjEntries.map(([s, v]) => ({ s, acc: v.correct / v.total, label: s }));
  withAcc.sort((a, b) => b.acc - a.acc);
  const best = withAcc[0]!;
  const worst = withAcc[withAcc.length - 1]!;
  const bestPct = Math.round(best.acc * 100);
  const worstPct = Math.round(worst.acc * 100);
  if (best.s === worst.s) {
    return `${childName} is averaging ${bestPct}% in ${SUBJECT_LABELS[best.s]} so far. Add more subjects to see a fuller picture.`;
  }
  return `${childName} is strongest in ${SUBJECT_LABELS[best.s]} (${bestPct}% correct) and could use extra practice in ${SUBJECT_LABELS[worst.s]} (${worstPct}%). Try a Practice round there today.`;
}

export function buildParentTipTemplate(stats: ChildOlympiadStats): string {
  if (stats.streak === 0) return "Tip: Set a fixed 'Olympiad time' each day — even 5 minutes builds the habit.";
  if (stats.streak < 3) return "Tip: Celebrate the streak! A high-five after each Daily 5 keeps motivation high.";
  if (stats.streak < 7) return "Tip: Talk through one question together. Reasoning out loud cements understanding.";
  return "Tip: Try the Weekly Test together as a family quiz night — make it fun!";
}

export function buildWeeklyDigest(stats: ChildOlympiadStats, childName: string): string {
  const weekKey = weekStartISO();
  const weekly = stats.weekly[weekKey];
  const historyThisWeek = stats.dailyHistory.filter((h) => h.date >= weekKey);
  const avg =
    historyThisWeek.length === 0
      ? 0
      : Math.round(historyThisWeek.reduce((a, h) => a + h.accuracyPct, 0) / historyThisWeek.length);
  const weeklyLine = weekly?.submitted ? `Weekly test: ${weekly.score} correct.` : "Weekly test: not yet completed.";
  return `${childName} this week: ${stats.streak}-day streak, ${stats.totalPoints} total points, ${avg}% daily accuracy. ${weeklyLine}`;
}
