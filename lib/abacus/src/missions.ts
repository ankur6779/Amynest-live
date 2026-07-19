import type { LevelId } from "./index.js";
import { featuredMicroGame, type MicroGameId } from "./micro-games.js";

export type MissionStepKind = "warmup" | "practice" | "mental" | "challenge" | "treasure";

export type MissionStep = {
  id: string;
  kind: MissionStepKind;
  title: string;
  emoji: string;
  /** Optional micro-game skin for practice/mental/challenge steps. */
  microGameId?: MicroGameId;
  done: boolean;
};

export type DailyMission = {
  dateKey: string;
  childId: number;
  level: LevelId;
  title: string;
  estimatedMinutes: number;
  steps: MissionStep[];
  treasureClaimed: boolean;
  rewardGems: number;
  rewardStars: number;
};

export function buildDailyMission(input: {
  dateKey: string;
  childId: number;
  level: LevelId;
  completedStepIds?: string[];
  treasureClaimed?: boolean;
}): DailyMission {
  const featured = featuredMicroGame(input.dateKey, input.childId);
  const done = new Set(input.completedStepIds ?? []);
  const steps: MissionStep[] = [
    {
      id: "warmup",
      kind: "warmup",
      title: "Warm-up",
      emoji: "🔥",
      done: done.has("warmup"),
    },
    {
      id: "practice",
      kind: "practice",
      title: featured.baseMode === "practice" ? featured.title : "Practice",
      emoji: featured.baseMode === "practice" ? featured.emoji : "✏️",
      microGameId: featured.baseMode === "practice" ? featured.id : "magic_beads",
      done: done.has("practice"),
    },
    {
      id: "mental",
      kind: "mental",
      title: featured.baseMode === "mental" ? featured.title : "Mental",
      emoji: featured.baseMode === "mental" ? featured.emoji : "🧠",
      microGameId: featured.baseMode === "mental" ? featured.id : "lightning",
      done: done.has("mental"),
    },
    {
      id: "challenge",
      kind: "challenge",
      title: featured.baseMode === "challenge" ? featured.title : "Challenge",
      emoji: featured.baseMode === "challenge" ? featured.emoji : "⏱️",
      microGameId: featured.baseMode === "challenge" ? featured.id : "treasure_hunt",
      done: done.has("challenge"),
    },
    {
      id: "treasure",
      kind: "treasure",
      title: "Treasure Reward",
      emoji: "💎",
      done: done.has("treasure") || Boolean(input.treasureClaimed),
    },
  ];

  return {
    dateKey: input.dateKey,
    childId: input.childId,
    level: input.level,
    title: "Today's Adventure",
    estimatedMinutes: 5,
    steps,
    treasureClaimed: Boolean(input.treasureClaimed),
    rewardGems: 3,
    rewardStars: 1,
  };
}

export function missionProgress(mission: DailyMission): {
  completed: number;
  total: number;
  pct: number;
  allCoreDone: boolean;
} {
  const core = mission.steps.filter((s) => s.kind !== "treasure");
  const completed = core.filter((s) => s.done).length;
  const total = core.length;
  return {
    completed,
    total,
    pct: total === 0 ? 0 : Math.round((completed / total) * 100),
    allCoreDone: completed >= total,
  };
}

export function markMissionStep(mission: DailyMission, stepId: string): DailyMission {
  return {
    ...mission,
    steps: mission.steps.map((s) => (s.id === stepId ? { ...s, done: true } : s)),
  };
}
