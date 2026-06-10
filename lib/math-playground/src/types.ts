export type PlaygroundAgeBand = "2-3" | "4-5" | "6-7" | "7-8";

export type PlaygroundActivityId =
  | "counting_adventure"
  | "addition_lab"
  | "subtraction_garden"
  | "multiplication_factory"
  | "division_bakery"
  | "number_patterns"
  | "math_puzzles"
  | "daily_challenge";

export type ObjectKind = "apple" | "flower" | "star" | "cookie" | "toy" | "block";

export type PuzzleTemplate =
  | "bigger_number"
  | "match_quantity"
  | "sort_ascending";

export interface PlaygroundObjectSpec {
  id: string;
  kind: ObjectKind;
  x: number;
  y: number;
  collected?: boolean;
}

export interface CountingPayload {
  targetCount: number;
  objects: PlaygroundObjectSpec[];
  objectKind: ObjectKind;
}

export interface AdditionPayload {
  augend: number;
  addend: number;
  objectKind: ObjectKind;
}

export interface SubtractionPayload {
  minuend: number;
  subtrahend: number;
  objectKind: ObjectKind;
}

export interface MultiplicationPayload {
  groups: number;
  perGroup: number;
  objectKind: ObjectKind;
}

export interface DivisionPayload {
  total: number;
  recipients: number;
  objectKind: ObjectKind;
}

export interface PatternPayload {
  sequence: (number | null)[];
  choices: number[];
  correctChoice: number;
  stepLabel: string;
}

export interface PuzzlePayload {
  template: PuzzleTemplate;
  leftValue?: number;
  rightValue?: number;
  targetNumeral?: number;
  targetCount?: number;
  sortNumbers?: number[];
}

export interface DailyPayload {
  tasks: ActivityParams[];
  timeLimitSec: 60;
}

export type ActivityPayload =
  | CountingPayload
  | AdditionPayload
  | SubtractionPayload
  | MultiplicationPayload
  | DivisionPayload
  | PatternPayload
  | PuzzlePayload
  | DailyPayload;

export type AdaptivityTier = "ease" | "standard" | "stretch";

export interface PlaygroundSessionRecord {
  activityId: PlaygroundActivityId;
  completedAt: number;
  hintsUsed: number;
  durationMs: number;
  success: boolean;
  tierUsed: AdaptivityTier;
}

export interface ActivityLearningStats {
  attempts: number;
  successes: number;
  hintsTotal: number;
  durationTotalMs: number;
  lastPlayedAt: number;
  lastTier: AdaptivityTier;
  masteryScore: number;
}

export interface PlaygroundLearningState {
  sessionHistory: PlaygroundSessionRecord[];
  activityStats: Partial<Record<PlaygroundActivityId, ActivityLearningStats>>;
}

export interface ParentAdaptiveInsight {
  strengthening: PlaygroundActivityId[];
  practicing: PlaygroundActivityId[];
  averageMastery: number;
}

export interface PlaygroundBadge {
  id: string;
  emoji: string;
  titleKey: string;
  unlockedAt?: number;
}

export interface PlaygroundSticker {
  id: string;
  emoji: string;
  titleKey: string;
  starsRequired: number;
}

export interface PlaygroundRewardState {
  stars: number;
  streakDays: number;
  lastPlayDate: string;
  badges: PlaygroundBadge[];
  unlockedStickers: string[];
  activityCompletions: Partial<Record<PlaygroundActivityId, number>>;
  dailyCompletedDates: string[];
}

export interface ActivityParams {
  id: string;
  activityId: PlaygroundActivityId;
  seed: number;
  ageBand: PlaygroundAgeBand;
  payload: ActivityPayload;
  adaptivityTier?: AdaptivityTier;
}

export interface PlaygroundPersistedState {
  version: 1 | 2;
  childId: number;
  rewards: PlaygroundRewardState;
  learning?: PlaygroundLearningState;
}

export interface ActivityCardDef {
  id: PlaygroundActivityId;
  emoji: string;
  titleKey: string;
  color: string;
  minAgeYears: number;
}
