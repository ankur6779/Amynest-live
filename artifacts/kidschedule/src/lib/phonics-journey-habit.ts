import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import { sanitizeDisplayPhonicsItems } from "@/lib/phonics-item-guards";
import type { PhonicsJourneyStage } from "./phonics-journey-roadmap";
import { PHONICS_JOURNEY_STAGES, MISSION_READING_POINTS } from "./phonics-journey-roadmap";

export type DailyCommitmentType = "5min" | "10sounds" | "1mission";

export type PhonicsHabitState = {
  lastActiveDate: string;
  commitment: DailyCommitmentType;
  today: {
    date: string;
    playCount: number;
    uniqueItemIds: string[];
    masteredSymbols: string[];
    pointsEarned: number;
  };
  lastSession: {
    date: string;
    summaryLines: string[];
    pointsEarned: number;
  } | null;
  weekly: {
    weekKey: string;
    practiceDays: number;
    wordsReviewed: number;
    wordsMastered: number;
    accuracyPct: number;
  };
  lastStageOrder: number;
};

export type ReadingIdentity =
  | "Developing Reader"
  | "Growing Reader"
  | "Confident Reader"
  | "Independent Reader"
  | "Story Reader";

export type ReadingBadge = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  earned: boolean;
  shareable: boolean;
};

export type WeeklyReadingReport = {
  practiceDays: number;
  wordsReviewed: number;
  wordsMastered: number;
  accuracyPct: number;
  accuracyDelta: number | null;
  practiceDaysLabel: string;
};

export type SessionCompletion = {
  wins: string[];
  pointsEarned: number;
  nextAction: string;
  nextScrollTarget: string;
};

const STORAGE_PREFIX = "amynest:phonics-habit:";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function emptyToday(): PhonicsHabitState["today"] {
  return {
    date: todayKey(),
    playCount: 0,
    uniqueItemIds: [],
    masteredSymbols: [],
    pointsEarned: 0,
  };
}

export function defaultHabitState(): PhonicsHabitState {
  return {
    lastActiveDate: todayKey(),
    commitment: "1mission",
    today: emptyToday(),
    lastSession: null,
    weekly: {
      weekKey: weekKey(),
      practiceDays: 0,
      wordsReviewed: 0,
      wordsMastered: 0,
      accuracyPct: 0,
    },
    lastStageOrder: 1,
  };
}

export function loadPhonicsHabitState(childId: number): PhonicsHabitState {
  if (typeof window === "undefined") return defaultHabitState();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultHabitState();
    const parsed = JSON.parse(raw) as PhonicsHabitState;
    const state = { ...defaultHabitState(), ...parsed };
    if (state.lastSession && !Array.isArray(state.lastSession.summaryLines)) {
      state.lastSession = { ...state.lastSession, summaryLines: [] };
    }
    if (state.today.date !== todayKey()) {
      state.today = emptyToday();
    }
    if (state.weekly.weekKey !== weekKey()) {
      state.weekly = {
        weekKey: weekKey(),
        practiceDays: 0,
        wordsReviewed: 0,
        wordsMastered: 0,
        accuracyPct: 0,
      };
    }
    return state;
  } catch {
    return defaultHabitState();
  }
}

export function savePhonicsHabitState(childId: number, state: PhonicsHabitState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function daysSinceLastActive(lastActiveDate: string): number {
  const last = new Date(`${lastActiveDate}T12:00:00`);
  const now = new Date();
  const diff = Math.floor((now.getTime() - last.getTime()) / 86400000);
  return Math.max(0, diff);
}

export function isComeback(lastActiveDate: string): boolean {
  return daysSinceLastActive(lastActiveDate) >= 3;
}

export function touchPhonicsVisit(childId: number): PhonicsHabitState {
  const state = loadPhonicsHabitState(childId);
  state.lastActiveDate = todayKey();
  savePhonicsHabitState(childId, state);
  return state;
}

export function setDailyCommitment(
  childId: number,
  commitment: DailyCommitmentType,
): PhonicsHabitState {
  const state = loadPhonicsHabitState(childId);
  state.commitment = commitment;
  savePhonicsHabitState(childId, state);
  return state;
}

export function recordPhonicsHabitActivity(
  childId: number,
  event: { type: "play" | "master"; itemId: string; symbol: string; points?: number },
): PhonicsHabitState {
  const state = loadPhonicsHabitState(childId);
  state.lastActiveDate = todayKey();
  if (state.today.date !== todayKey()) {
    state.today = emptyToday();
  }

  if (event.type === "play") {
    state.today.playCount += 1;
    if (!state.today.uniqueItemIds.includes(event.itemId)) {
      state.today.uniqueItemIds.push(event.itemId);
    }
    state.today.pointsEarned += event.points ?? 5;
  } else {
    if (!state.today.masteredSymbols.includes(event.symbol)) {
      state.today.masteredSymbols.push(event.symbol);
    }
    state.today.pointsEarned += event.points ?? 10;
  }

  const lines: string[] = [];
  if (event.type === "play") {
    lines.push(`Practiced ${event.symbol}`);
  } else {
    lines.push(`Mastered "${event.symbol}"`);
  }
  if (state.today.pointsEarned > 0) {
    lines.push(`Earned ${state.today.pointsEarned} points`);
  }

  state.lastSession = {
    date: todayKey(),
    summaryLines: lines.slice(-4),
    pointsEarned: state.today.pointsEarned,
  };

  savePhonicsHabitState(childId, state);
  return state;
}

export function syncWeeklyBaseline(
  childId: number,
  momentum: {
    practiceDays: number;
    wordsReviewed: number;
    wordsMastered: number;
    accuracyPct: number;
  },
): PhonicsHabitState {
  const state = loadPhonicsHabitState(childId);
  const wk = weekKey();
  if (state.weekly.weekKey !== wk) {
    state.weekly = { weekKey: wk, ...momentum };
  }
  savePhonicsHabitState(childId, state);
  return state;
}

export function isCommitmentAchieved(
  commitment: DailyCommitmentType,
  params: {
    missionComplete: boolean;
    todayPlayCount: number;
    todayUniqueSounds: number;
  },
): boolean {
  switch (commitment) {
    case "1mission":
      return params.missionComplete;
    case "10sounds":
      return params.todayUniqueSounds >= 10 || params.todayPlayCount >= 10;
    case "5min":
      return params.todayPlayCount >= 5 || params.missionComplete;
    default:
      return false;
  }
}

export function commitmentLabel(type: DailyCommitmentType): string {
  switch (type) {
    case "5min":
      return "5 Minutes";
    case "10sounds":
      return "10 Sounds";
    case "1mission":
      return "1 Mission";
  }
}

export function resolveReadingIdentity(
  activeStage: PhonicsJourneyStage,
  journeyCompletionPct: number,
): ReadingIdentity {
  if (activeStage.id === "story_reading" || journeyCompletionPct >= 85) {
    return "Story Reader";
  }
  if (activeStage.order >= 5 || journeyCompletionPct >= 65) {
    return "Independent Reader";
  }
  if (activeStage.order >= 4 || journeyCompletionPct >= 45) {
    return "Confident Reader";
  }
  if (activeStage.order >= 2 || journeyCompletionPct >= 20) {
    return "Growing Reader";
  }
  return "Developing Reader";
}

export function resolveStreakChainMessage(
  streak: number,
  missionComplete: boolean,
  commitmentAchieved: boolean,
): string {
  if (streak <= 0) {
    return "Complete today's reading goal to start your streak.";
  }
  if (missionComplete || commitmentAchieved) {
    return "Today's chain link is secure — come back tomorrow to keep it going!";
  }
  return "Complete 1 mission today to protect your streak.";
}

export function buildWeeklyReadingReport(
  momentum: {
    practiceDays: number;
    wordsReviewed: number;
    wordsMastered: number;
    accuracyPct: number;
  },
  weeklyBaseline: PhonicsHabitState["weekly"],
): WeeklyReadingReport {
  const accuracyDelta =
    weeklyBaseline.accuracyPct > 0 && momentum.accuracyPct > 0
      ? momentum.accuracyPct - weeklyBaseline.accuracyPct
      : null;

  return {
    ...momentum,
    accuracyDelta,
    practiceDaysLabel: `${momentum.practiceDays} day${momentum.practiceDays !== 1 ? "s" : ""}`,
  };
}

export function buildDailyWins(params: {
  todayMastered: string[];
  todayUniqueSounds: number;
  todayPlayCount: number;
  missionComplete: boolean;
  quizComplete: boolean;
  lastTestScore: number | null;
}): string[] {
  const wins: string[] = [];
  const newSounds = Math.min(params.todayUniqueSounds, 10);
  if (newSounds > 0) {
    wins.push(`You learned ${newSounds} new sound${newSounds !== 1 ? "s" : ""} today.`);
  }
  if (params.todayMastered.length > 0) {
    wins.push(
      `You mastered ${params.todayMastered.length} word${params.todayMastered.length !== 1 ? "s" : ""} today.`,
    );
  }
  if (params.quizComplete && params.lastTestScore != null) {
    wins.push(`Quick Check score: ${params.lastTestScore}% — nice work!`);
  } else if (params.quizComplete) {
    wins.push("You completed today's Quick Check.");
  }
  if (params.missionComplete) {
    wins.push("Today's mission is complete.");
  }
  if (wins.length === 0 && params.todayPlayCount > 0) {
    wins.push("You showed up for reading practice today — that counts!");
  }
  if (wins.length === 0) {
    wins.push("Start today's reading goal — small steps build strong readers.");
  }
  return wins.slice(0, 3);
}

export function buildSessionCompletion(params: {
  todayPlayCount: number;
  todayUniqueSounds: number;
  todayMastered: string[];
  quizComplete: boolean;
  nextStage: PhonicsJourneyStage | null;
}): SessionCompletion {
  const wins: string[] = [];
  if (params.todayUniqueSounds > 0) {
    wins.push(`${params.todayUniqueSounds} sounds reviewed`);
  }
  if (params.todayPlayCount > 0) {
    wins.push(`${params.todayPlayCount} practice plays`);
  }
  if (params.todayMastered.length > 0) {
    wins.push(`${params.todayMastered.length} word${params.todayMastered.length !== 1 ? "s" : ""} mastered`);
  }
  if (params.quizComplete) {
    wins.push("Quick Check completed");
  }
  if (wins.length === 0) {
    wins.push("Mission completed");
  }

  const nextLabel = params.nextStage
    ? `Preview ${params.nextStage.milestoneName}`
    : "View today's progress";

  return {
    wins,
    pointsEarned: MISSION_READING_POINTS,
    nextAction: nextLabel,
    nextScrollTarget: params.nextStage ? "phonics-next-unlock" : "phonics-progress",
  };
}

export function resolveFutureMotivation(params: {
  nextStage: PhonicsJourneyStage | null;
  sessionsUntilMilestone: number;
  masteredCount: number;
  nextBadgeThreshold: number;
}): string {
  if (params.nextStage && params.sessionsUntilMilestone <= 8) {
    return `Keep going and unlock ${params.nextStage.milestoneName} in ${params.sessionsUntilMilestone} session${params.sessionsUntilMilestone !== 1 ? "s" : ""}.`;
  }
  const wordsAway = params.nextBadgeThreshold - params.masteredCount;
  if (wordsAway > 0 && wordsAway <= 20) {
    return `Only ${wordsAway} word${wordsAway !== 1 ? "s" : ""} away from your next reading milestone.`;
  }
  return "Every session moves your reader closer to independent stories.";
}

export function buildParentConfidenceTransform(
  activeStage: PhonicsJourneyStage,
  previousStageOrder: number,
): { before: string; now: string } | null {
  if (activeStage.order <= previousStageOrder) return null;
  const prev =
    PHONICS_JOURNEY_STAGES.find((s) => s.order === previousStageOrder) ??
    PHONICS_JOURNEY_STAGES[0]!;
  return {
    before: prev.outcomeLabel,
    now: activeStage.outcomeLabel,
  };
}

export function resolveReadingBadges(params: {
  masteredCount: number;
  streak: number;
  activeStage: PhonicsJourneyStage;
  journeyCompletionPct: number;
}): ReadingBadge[] {
  const badges: ReadingBadge[] = [];
  const { masteredCount, streak, activeStage, journeyCompletionPct } = params;

  if (masteredCount >= 1) {
    badges.push({
      id: "first_word",
      emoji: "🌟",
      title: "First Word Mastered",
      subtitle: "The reading journey begins",
      earned: true,
      shareable: true,
    });
  }
  if (masteredCount >= 10) {
    badges.push({
      id: "words_10",
      emoji: "📚",
      title: "10 Words Mastered",
      subtitle: "Building a real word bank",
      earned: true,
      shareable: false,
    });
  }
  if (masteredCount >= 50) {
    badges.push({
      id: "words_50",
      emoji: "🎉",
      title: "50 Words Mastered",
      subtitle: "A moment worth celebrating",
      earned: true,
      shareable: true,
    });
  }
  if (streak >= 7) {
    badges.push({
      id: "streak_7",
      emoji: "🔥",
      title: "7 Day Reading Streak",
      subtitle: "Consistency builds confident readers",
      earned: true,
      shareable: true,
    });
  }
  if (streak >= 14) {
    badges.push({
      id: "streak_14",
      emoji: "🏅",
      title: "Reading streak: 14 days",
      subtitle: "A habit is forming",
      earned: true,
      shareable: true,
    });
  }
  if (activeStage.id === "story_reading" || journeyCompletionPct >= 80) {
    badges.push({
      id: "story_reader",
      emoji: "🏆",
      title: "Story Reader",
      subtitle: "Story Reading unlocked",
      earned: journeyCompletionPct >= 60,
      shareable: true,
    });
  }

  return badges.slice(0, 5);
}

export function nextBadgeThreshold(masteredCount: number): number {
  if (masteredCount < 1) return 1;
  if (masteredCount < 10) return 10;
  if (masteredCount < 50) return 50;
  if (masteredCount < 100) return 100;
  return masteredCount + 25;
}

export function updateStageProgress(
  childId: number,
  activeStageOrder: number,
): PhonicsHabitState {
  const state = loadPhonicsHabitState(childId);
  if (activeStageOrder > state.lastStageOrder) {
    state.lastStageOrder = activeStageOrder;
    savePhonicsHabitState(childId, state);
  }
  return state;
}

export function comebackActions(): { label: string; scrollTarget: string }[] {
  return [
    { label: "Review mastered words", scrollTarget: "phonics-practice-sounds" },
    { label: "Quick Check", scrollTarget: "phonics-daily-quiz" },
    { label: "Continue journey", scrollTarget: "phonics-today-mission" },
  ];
}

/** Derive today's activity from progress when habit store is empty. */
export function inferTodayFromProgress(
  progress: PhonicsProgressMap,
  items: DisplayPhonicsItem[],
): Pick<PhonicsHabitState["today"], "playCount" | "uniqueItemIds" | "masteredSymbols"> {
  const safeItems = sanitizeDisplayPhonicsItems(items);
  const uniqueItemIds = Object.keys(progress.practiced);
  const playCount = Object.values(progress.practiced).reduce((a, b) => a + b, 0);
  const masteredSymbols = safeItems
    .filter((i) => progress.mastered[i.id])
    .map((i) => i.symbol);
  return { playCount, uniqueItemIds, masteredSymbols };
}
