/** Amy Health Lab™ — core domain types */

export type HealthGameId =
  | "breath-control"
  | "flamingo-balance"
  | "reaction-time"
  | "freeze-statue"
  | "finger-stability"
  | "calmness-meter";

export type XpTier = "bronze" | "silver" | "gold" | "platinum" | "perfect";

export type HealthLevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type BadgeId =
  | "first-challenge"
  | "first-perfect"
  | "streak-7"
  | "streak-30"
  | "balance-master"
  | "focus-master"
  | "calmness-master"
  | "reaction-ninja"
  | "crystal-guardian"
  | "galaxy-hero"
  | "still-finger-master"
  | "flamingo-king"
  | "statue-master"
  | "secret-midnight-scientist"
  | "secret-perfect-week"
  | "secret-golden-touch";

export type QuestId =
  | "complete-3"
  | "complete-all-6"
  | "beat-pb"
  | "maintain-streak"
  | "earn-300-xp"
  | "complete-under-5min";

export type WellnessMetric =
  | "focus"
  | "calmness"
  | "balance"
  | "coordination"
  | "consistency"
  | "overall";

export type DashboardRange = "today" | "7d" | "30d" | "90d" | "lifetime";

export type EquipmentSlot = "head" | "face" | "body" | "trail" | "pet" | "background" | "effects";

export interface GameSessionResult {
  gameId: HealthGameId;
  timestamp: number;
  durationMs: number;
  xpEarned: number;
  xpTier: XpTier;
  score: number;
  metrics: Partial<Record<WellnessMetric, number>>;
  personalBest: boolean;
  achievementUnlocked?: string;
  simulated?: boolean;
  cheatFlags?: string[];
  eligibleForBadges?: boolean;
}

export interface BadgeRecord {
  id: BadgeId;
  unlockedAt: number;
}

export interface QuestProgress {
  id: QuestId;
  completedAt?: number;
  progress: number;
  target: number;
}

export interface DailyQuestState {
  dateKey: string;
  quests: QuestProgress[];
  allCompleted: boolean;
}

export interface AvatarEvolutionRecord {
  level: HealthLevelId;
  avatarId: string;
  timestamp: number;
}

export interface HealthLabPersistedState {
  version: 2;
  childId: number;
  totalXp: number;
  coins: number;
  level: HealthLevelId;
  prestige: number;
  streakDays: number;
  questStreakDays: number;
  lastPlayDateKey: string | null;
  lastQuestCompleteDateKey: string | null;
  streakMilestonesCelebrated: number[];
  badges: BadgeRecord[];
  avatarId: string;
  unlockedAvatarItems: string[];
  equippedItems: Partial<Record<EquipmentSlot, string>>;
  gameHistory: GameSessionResult[];
  personalBests: Partial<Record<HealthGameId, number>>;
  dailyQuests: DailyQuestState | null;
  wellnessScores: Record<WellnessMetric, number>;
  gamesCompletedToday: HealthGameId[];
  totalSessions: number;
  calmnessRewardedToday: boolean;
  calmnessSnapshotsToday: number;
  dailySurpriseClaimedDateKey: string | null;
  treasureChestOpenedThisWeek: string | null;
  sessionBurstStartMs: number | null;
  sessionBurstCount: number;
  avatarEvolutionHistory: AvatarEvolutionRecord[];
  weeklyChallengeProgress: number;
  weeklyChallengeWeekKey: string | null;
  weeklyChallengeCompletedWeekKey: string | null;
  monthlyMegaQuestClaimedMonthKey: string | null;
}

export type HealthLabView =
  | "home"
  | "progress"
  | "dashboard"
  | "shop"
  | "game-select"
  | { kind: "game"; gameId: HealthGameId }
  | { kind: "results"; result: GameSessionResult }
  | { kind: "celebration"; type: "level-up" | "streak" | "badge" | "quest" | "treasure" | "surprise"; payload: unknown };

export interface MotionSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface MotionSensorState {
  available: boolean;
  simulated: boolean;
  permissionGranted: boolean;
  permissionDenied: boolean;
  latest: MotionSample | null;
  variance: number;
  stabilityPercent: number;
}

export interface SessionCompleteOptions {
  cheatFlags?: string[];
  simulated?: boolean;
  eligibleForBadges?: boolean;
  eligibleForXp?: boolean;
  achievementUnlocked?: string;
  extraMetrics?: Partial<Record<WellnessMetric, number>>;
}
