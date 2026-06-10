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

export type MiniGameTemplate =
  | "pop_correct_answer"
  | "rocket_counting"
  | "balloon_burst"
  | "feed_the_monkey"
  | "number_train"
  | "castle_builder";

export type PuzzleTemplate =
  | "bigger_number"
  | "match_quantity"
  | "sort_ascending"
  | MiniGameTemplate;

export type PlaygroundPlayMode = "touch" | "voice";

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

export interface PuzzleBalloonSpec {
  id: string;
  value: number;
}

export interface CastleBuildRound {
  question: string;
  answer: number;
  choices: number[];
}

export interface PuzzlePayload {
  template: PuzzleTemplate;
  leftValue?: number;
  rightValue?: number;
  targetNumeral?: number;
  targetCount?: number;
  sortNumbers?: number[];
  /** Mini-game fields (Phase 4c) */
  question?: string;
  choices?: number[];
  correctIndex?: number;
  correctAnswer?: number;
  fuelTarget?: number;
  targetQuantity?: number;
  balloons?: PuzzleBalloonSpec[];
  targetBananas?: number;
  trainSequence?: (number | null)[];
  trainChoices?: number[];
  castlePiecesTotal?: number;
  castleRounds?: CastleBuildRound[];
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
  /** Phase 4 optional signals — omitted on legacy v2 sessions */
  playMode?: PlaygroundPlayMode;
  responseTimeMs?: number;
  voiceConfidence?: number;
  retryCount?: number;
  idleMs?: number;
  consecutiveSuccessAtEnd?: number;
  consecutiveFailureAtEnd?: number;
}

/** Alias for extended session records (all v4 fields optional). */
export type PlaygroundSessionRecordV4 = PlaygroundSessionRecord;

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

export type SkillTrend = "improving" | "stable" | "needs_practice";

export interface SkillBreakdown {
  counting: number;
  addition: number;
  subtraction: number;
  multiplication: number;
  division: number;
  patterns: number;
}

export interface ParentRetentionSnapshot {
  mathConfidenceStars: 1 | 2 | 3 | 4 | 5;
  skillBreakdown: SkillBreakdown;
  recommendedActivityId: PlaygroundActivityId;
  recommendedTrend: SkillTrend;
  sessionCount: number;
  generatedAt: number;
}

export interface PlaygroundEngagementState {
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastInteractionAt: number;
  sessionStartedAt: number;
}

export interface PlaygroundPersistedState {
  version: 1 | 2 | 3;
  childId: number;
  rewards: PlaygroundRewardState;
  learning?: PlaygroundLearningState;
  /** Phase 4 — optional; absent on v1/v2 loads until migration */
  preferredPlayMode?: PlaygroundPlayMode;
  lastParentSnapshot?: ParentRetentionSnapshot;
  engagement?: PlaygroundEngagementState;
}

export interface ActivityCardDef {
  id: PlaygroundActivityId;
  emoji: string;
  titleKey: string;
  color: string;
  minAgeYears: number;
}
