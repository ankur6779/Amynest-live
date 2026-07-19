import type { LevelId } from "@workspace/abacus";
import type { HubModuleActionGateState } from "@/components/hub-module-page-shell";

export type AbacusMode = "learn" | "practice" | "challenge" | "mental" | "tutor";
export type ZoneScreen = "home" | "play" | "warmup";
export type ViewMode = "child" | "parent";
export type BoardFeedback = "none" | "correct" | "wrong";

export interface AbacusProgressShape {
  currentLevel: LevelId;
  lastMode: AbacusMode;
  completedLevels: LevelId[];
  highestUnlocked: LevelId;
  bestScores: Record<string, { points: number; accuracyPct: number; completedAt: string }>;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  childId: number;
  name: string;
  points: number;
  isMe: boolean;
}

export interface LeaderboardShape {
  weekStart: string;
  top: LeaderboardEntry[];
  me: { rank: number; points: number; total: number };
}

export interface AbacusZoneProps {
  childId: number;
  childName: string;
  ageYears: number;
  gate?: HubModuleActionGateState;
}
