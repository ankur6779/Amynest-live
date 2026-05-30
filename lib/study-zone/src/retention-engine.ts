// Smart Study Zone — Phase 3 retention & engagement (pure helpers).

import type { StudyMode } from "./types";
import { PLAY_CATEGORIES } from "./content/play";
import {
  DAILY_GOAL_TARGET,
  STREAK_MILESTONES,
  daysBetween,
  todayIso,
  type EngagementState,
} from "./engagement";
import {
  FUTURE_WORLDS,
  computeCurriculumUnlockSnapshot,
  futureWorldsForChild,
  getNextUnlockWorld,
  journeyStageIndex,
  resolveJourneyStage,
  type CurriculumUnlockSnapshot,
  type FutureWorld,
  type JourneyStageId,
} from "./curriculum-catalog";

export const MILESTONE_LESSON_TARGET = 3;

export interface RetentionProgressInput {
  play: Record<string, string[]>;
  basic: Record<string, Record<string, { score?: number; total?: number; completed: boolean }>>;
  advanced: Record<string, Record<string, { score?: number; total?: number; completed: boolean }>>;
  engagement: EngagementState;
}

export interface NextMilestone {
  title: string;
  action: string;
  rewardTitle: string;
  rewardDescription: string;
  completed: number;
  target: number;
  bonusStars: number;
}

export interface PersonalizedWorld extends FutureWorld {
  because: string;
  recommended: boolean;
}

export interface StudyAchievement {
  id: string;
  title: string;
  emoji: string;
  unlocked: boolean;
  progressPct: number;
  unlockHint: string;
}

export interface GrowthDashboard {
  strengths: { label: string; emoji: string }[];
  growing: { label: string; emoji: string }[];
  future: { label: string; emoji: string }[];
}

export interface FutureReward {
  id: string;
  emoji: string;
  title: string;
}

export interface SuccessProjection {
  months: number;
  outcome: string;
}

export interface ReEngagementCard {
  daysInactive: number;
  lastCategories: { id: string; label: string; emoji: string }[];
  starsWaiting: number;
}

export interface UniverseMapNode {
  id: string;
  label: string;
  emoji: string;
  status: "completed" | "current" | "locked";
  worldId?: string;
}

export interface StreakCalendarDay {
  iso: string;
  active: boolean;
  isToday: boolean;
}

const PLAY_CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  alphabets: { label: "Alphabets", emoji: "🔤" },
  numbers: { label: "Numbers", emoji: "🔢" },
  colors: { label: "Colors", emoji: "🎨" },
  shapes: { label: "Shapes", emoji: "🔷" },
  animals: { label: "Animals", emoji: "🐾" },
  fruits: { label: "Fruits & Food", emoji: "🍎" },
  rhymes: { label: "Rhymes", emoji: "🎵" },
};

const PERSONALIZED_TRIGGERS: Array<{
  categoryId: string;
  because: string;
  worldId: string;
}> = [
  { categoryId: "animals", because: "your child enjoys Animals", worldId: "science-explorer" },
  { categoryId: "rhymes", because: "your child loves Stories", worldId: "reading-vocabulary" },
  { categoryId: "numbers", because: "your child performs well in Numbers", worldId: "math-mastery" },
  { categoryId: "shapes", because: "your child explores Shapes", worldId: "stem-logic" },
  { categoryId: "colors", because: "your child loves Colors", worldId: "reading-vocabulary" },
  { categoryId: "alphabets", because: "your child is mastering Letters", worldId: "reading-vocabulary" },
];

function playCategoryCounts(progress: RetentionProgressInput): Array<{ id: string; count: number }> {
  return Object.entries(progress.play)
    .map(([id, items]) => ({ id, count: items.length }))
    .sort((a, b) => b.count - a.count);
}

function totalPlayItems(progress: RetentionProgressInput): number {
  return Object.values(progress.play).reduce((n, items) => n + items.length, 0);
}

export function computeNextMilestone(
  progress: RetentionProgressInput,
  ageYears: number,
  childClass?: string | null,
): NextMilestone {
  const snapshot = computeCurriculumUnlockSnapshot(ageYears, childClass);
  const nextWorld = getNextUnlockWorld(ageYears, childClass);
  const completed = Math.min(MILESTONE_LESSON_TARGET, progress.engagement.goalProgress);
  const remaining = Math.max(0, MILESTONE_LESSON_TARGET - completed);

  return {
    title: "Next Milestone",
    action:
      remaining > 0
        ? `Complete ${remaining} more lesson${remaining === 1 ? "" : "s"}`
        : "Milestone ready — keep exploring!",
    rewardTitle: nextWorld?.shortTitle ?? snapshot.nextUnlockTitle,
    rewardDescription: `${nextWorld?.shortTitle ?? "Next world"} preview`,
    completed,
    target: MILESTONE_LESSON_TARGET,
    bonusStars: 15,
  };
}

export function personalizedFutureWorlds(
  progress: RetentionProgressInput,
  ageYears: number,
  childClass?: string | null,
): PersonalizedWorld[] {
  const base = futureWorldsForChild(ageYears, childClass);
  const counts = playCategoryCounts(progress);
  const top = counts[0];
  const recommendedIds = new Set<string>();

  const personalized: PersonalizedWorld[] = [];

  for (const trigger of PERSONALIZED_TRIGGERS) {
    const world = base.find((w) => w.id === trigger.worldId);
    const catCount = progress.play[trigger.categoryId]?.length ?? 0;
    if (!world || catCount < 2) continue;
    if (recommendedIds.has(world.id)) continue;
    recommendedIds.add(world.id);
    personalized.push({
      ...world,
      because: trigger.because,
      recommended: true,
    });
  }

  if (top && top.count >= 3) {
    const match = PERSONALIZED_TRIGGERS.find((t) => t.categoryId === top.id);
    const world = match ? base.find((w) => w.id === match.worldId) : undefined;
    if (world && !recommendedIds.has(world.id)) {
      recommendedIds.add(world.id);
      personalized.unshift({
        ...world,
        because: match!.because,
        recommended: true,
      });
    }
  }

  for (const world of base) {
    if (recommendedIds.has(world.id)) continue;
    personalized.push({
      ...world,
      because: "coming up on your learning path",
      recommended: false,
    });
  }

  return personalized.slice(0, 5);
}

function achievementProgress(
  progress: RetentionProgressInput,
  categoryId: string,
  target: number,
): number {
  const done = progress.play[categoryId]?.length ?? 0;
  return Math.min(100, Math.round((done / target) * 100));
}

export function buildAchievementCollection(
  progress: RetentionProgressInput,
  mode: StudyMode,
): StudyAchievement[] {
  const playTotal = totalPlayItems(progress);
  const basicCompleted = Object.values(progress.basic).reduce(
    (n, subj) => n + Object.values(subj).filter((t) => t.completed).length,
    0,
  );

  return [
    {
      id: "alphabet-explorer",
      title: "Alphabet Explorer",
      emoji: "🔤",
      unlocked: (progress.play.alphabets?.length ?? 0) >= 5,
      progressPct: achievementProgress(progress, "alphabets", 5),
      unlockHint: "Explore 5 letters",
    },
    {
      id: "number-hero",
      title: "Number Hero",
      emoji: "🔢",
      unlocked: (progress.play.numbers?.length ?? 0) >= 5,
      progressPct: achievementProgress(progress, "numbers", 5),
      unlockHint: "Learn 5 numbers",
    },
    {
      id: "color-master",
      title: "Color Master",
      emoji: "🎨",
      unlocked: (progress.play.colors?.length ?? 0) >= 6,
      progressPct: achievementProgress(progress, "colors", 6),
      unlockHint: "Discover 6 colors",
    },
    {
      id: "shape-detective",
      title: "Shape Detective",
      emoji: "🔷",
      unlocked: (progress.play.shapes?.length ?? 0) >= 3,
      progressPct: achievementProgress(progress, "shapes", 3),
      unlockHint: "Find 3 shapes",
    },
    {
      id: "reading-champion",
      title: "Reading Champion",
      emoji: "📖",
      unlocked: mode !== "play" || basicCompleted >= 2,
      progressPct: mode === "play" ? Math.min(100, Math.round((playTotal / 20) * 100)) : 100,
      unlockHint: "Reach Basic Learning stage",
    },
    {
      id: "science-explorer",
      title: "Science Explorer",
      emoji: "🔬",
      unlocked: (progress.play.animals?.length ?? 0) >= 8,
      progressPct: achievementProgress(progress, "animals", 8),
      unlockHint: "Explore 8 animals",
    },
    {
      id: "logic-wizard",
      title: "Logic Wizard",
      emoji: "🧩",
      unlocked: (progress.play.shapes?.length ?? 0) >= 6 && (progress.play.numbers?.length ?? 0) >= 10,
      progressPct: Math.round(
        (achievementProgress(progress, "shapes", 6) + achievementProgress(progress, "numbers", 10)) / 2,
      ),
      unlockHint: "Master shapes & numbers",
    },
    {
      id: "stem-innovator",
      title: "STEM Innovator",
      emoji: "🚀",
      unlocked: mode === "advanced",
      progressPct: mode === "advanced" ? 100 : mode === "basic" ? 55 : Math.min(100, Math.round((playTotal / 40) * 100)),
      unlockHint: "Reach Advanced Study",
    },
  ];
}

export function buildStreakCalendar(
  engagement: EngagementState,
  now: Date = new Date(),
): { streak: number; days: StreakCalendarDay[]; nextRewardDay: number | null } {
  const today = todayIso(now);
  const days: StreakCalendarDay[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = todayIso(d);
    const gap = engagement.lastActiveDate ? daysBetween(iso, engagement.lastActiveDate) : 999;
    const active =
      iso === engagement.lastActiveDate ||
      (engagement.streak > 0 && engagement.lastActiveDate != null && gap >= 0 && gap <= engagement.streak - 1 && iso <= today);
    days.push({ iso, active: active && iso <= today, isToday: iso === today });
  }

  const nextRewardDay = STREAK_MILESTONES.find((m) => m > engagement.streak) ?? null;
  return { streak: engagement.streak, days, nextRewardDay };
}

export function streakRewardLabel(day: number): string {
  if (day === 7) return "Bonus stars";
  if (day === 14) return "New badge";
  if (day === 30) return "Premium achievement";
  return "Streak reward";
}

export function buildGrowthDashboard(
  progress: RetentionProgressInput,
  mode: StudyMode,
): GrowthDashboard {
  const counts = playCategoryCounts(progress);
  const strengths = counts
    .filter((c) => c.count >= 3)
    .slice(0, 3)
    .map((c) => ({
      label: PLAY_CATEGORY_LABELS[c.id]?.label ?? c.id,
      emoji: "⭐",
    }));

  if (strengths.length === 0 && mode === "play") {
    strengths.push(
      { label: "Exploration", emoji: "⭐" },
      { label: "Curiosity", emoji: "⭐" },
    );
  }

  const growing: { label: string; emoji: string }[] = [];
  if ((progress.play.rhymes?.length ?? 0) > 0 || (progress.play.alphabets?.length ?? 0) > 0) {
    growing.push({ label: "Reading", emoji: "📈" });
  }
  if ((progress.play.numbers?.length ?? 0) > 0) {
    growing.push({ label: "Memory", emoji: "📈" });
  }
  if (growing.length === 0) {
    growing.push({ label: "Focus", emoji: "📈" });
  }

  const future = [
    { label: "Science", emoji: "🔒" },
    { label: "Writing", emoji: "🔒" },
    { label: "Algebra", emoji: "🔒" },
  ];
  if (mode === "basic") {
    future.splice(2, 1, { label: "Advanced Math", emoji: "🔒" });
  }

  return { strengths, growing, future };
}

export function buildFutureRewards(
  snapshot: CurriculumUnlockSnapshot,
  milestone: NextMilestone,
): FutureReward[] {
  return [
    { id: "world", emoji: "🎁", title: `${milestone.rewardTitle} World` },
    { id: "badge", emoji: "🏅", title: "New Achievement Badge" },
    { id: "stories", emoji: "📚", title: "Advanced Stories" },
    { id: "missions", emoji: "🚀", title: "Science Missions" },
  ].slice(0, snapshot.stagesAhead > 0 ? 4 : 2);
}

export function buildSuccessProjection(
  ageYears: number,
  mode: StudyMode,
): SuccessProjection[] {
  if (mode === "play" || ageYears <= 5) {
    return [
      { months: 3, outcome: "Reading readiness" },
      { months: 6, outcome: "Early science skills" },
      { months: 12, outcome: "Strong foundational learning" },
    ];
  }
  if (mode === "basic") {
    return [
      { months: 3, outcome: "Confident core subjects" },
      { months: 6, outcome: "Adaptive practice mastery" },
      { months: 12, outcome: "Advanced study readiness" },
    ];
  }
  return [
    { months: 3, outcome: "Algebra confidence" },
    { months: 6, outcome: "Exam-style problem solving" },
    { months: 12, outcome: "Age 15 graduation track" },
  ];
}

export function buildReEngagementCard(
  progress: RetentionProgressInput,
  now: Date = new Date(),
): ReEngagementCard | null {
  const today = todayIso(now);
  const last = progress.engagement.lastActiveDate;
  if (!last) return null;
  const inactive = daysBetween(last, today);
  if (inactive <= 2) return null;

  const counts = playCategoryCounts(progress);
  const lastCategories = counts.slice(0, 2).map((c) => ({
    id: c.id,
    label: PLAY_CATEGORY_LABELS[c.id]?.label ?? c.id,
    emoji: PLAY_CATEGORY_LABELS[c.id]?.emoji ?? "▶",
  }));

  if (lastCategories.length === 0) {
    lastCategories.push(
      { id: "colors", label: "Colors", emoji: "🎨" },
      { id: "numbers", label: "Numbers", emoji: "🔢" },
    );
  }

  return {
    daysInactive: inactive,
    lastCategories,
    starsWaiting: Math.min(30, 10 + inactive * 3),
  };
}

const MAP_NODES: Array<{ id: string; label: string; emoji: string; stageId?: JourneyStageId; worldId?: string }> = [
  { id: "play", label: "Play & Learn", emoji: "👶", stageId: "play" },
  { id: "reading", label: "Reading World", emoji: "📖", worldId: "reading-vocabulary" },
  { id: "science", label: "Science Explorer", emoji: "🔬", worldId: "science-explorer" },
  { id: "math", label: "Math Mastery", emoji: "➕", worldId: "math-mastery" },
  { id: "stem", label: "STEM Lab", emoji: "🧩", worldId: "stem-logic" },
  { id: "advanced", label: "Advanced Study", emoji: "🎓", stageId: "advanced" },
  { id: "graduation", label: "Graduation", emoji: "🏆" },
];

export function buildUniverseMap(
  mode: StudyMode,
  ageYears: number,
  childClass?: string | null,
): UniverseMapNode[] {
  const currentStage = resolveJourneyStage(ageYears, childClass);
  const currentIdx = journeyStageIndex(currentStage);
  const nextWorld = getNextUnlockWorld(ageYears, childClass);

  return MAP_NODES.map((node) => {
    if (node.id === "graduation") {
      return {
        ...node,
        status: ageYears >= 14 && currentStage === "advanced" ? "current" : "locked",
      } as UniverseMapNode;
    }
    if (node.stageId === "play") {
      return {
        ...node,
        status: currentStage === "play" ? "current" : "completed",
      } as UniverseMapNode;
    }
    if (node.stageId === "advanced") {
      return {
        ...node,
        status:
          currentStage === "advanced"
            ? "current"
            : currentIdx > journeyStageIndex("advanced")
              ? "completed"
              : "locked",
      } as UniverseMapNode;
    }
    const world = FUTURE_WORLDS.find((w) => w.id === node.worldId);
    if (!world) return { ...node, status: "locked" } as UniverseMapNode;

    if (ageYears >= world.unlockAge && currentIdx >= journeyStageIndex(world.stageId)) {
      return { ...node, status: "completed", worldId: node.worldId } as UniverseMapNode;
    }
    if (nextWorld?.id === node.worldId) {
      return { ...node, status: "current", worldId: node.worldId } as UniverseMapNode;
    }
    return { ...node, status: "locked", worldId: node.worldId } as UniverseMapNode;
  });
}

export function topPlayCategories(progress: RetentionProgressInput, limit = 3): string[] {
  return playCategoryCounts(progress).slice(0, limit).map((c) => c.id);
}

export { PLAY_CATEGORIES };
