/** Unified family intelligence types — single brain for all product surfaces. */

export type ProductSurface =
  | "notifications"
  | "amy_ai"
  | "parent_hub"
  | "rewards"
  | "learning_zone"
  | "events"
  | "subscriptions"
  | "routine";

export type FamilyGoalType =
  | "reading"
  | "routine"
  | "learning"
  | "screen_time";

export type FamilyMomentType =
  | "first_successful_week"
  | "first_month"
  | "learning_breakthrough"
  | "consistency_milestone"
  | "habit_formation";

export type ActionCategory =
  | "routine_problem"
  | "learning_problem"
  | "retention_problem"
  | "subscription_opportunity";

export type InterventionType =
  | "notification"
  | "amy_prompt"
  | "hub_card"
  | "reward"
  | "learning_nudge"
  | "subscription_offer";

export interface HealthScoreComponents {
  routineConsistency: number;
  learningConsistency: number;
  sleepConsistency: number;
  parentEngagement: number;
  screenTimeBalance: number;
  streakHealth: number;
}

export interface FamilyHealthScore {
  score: number;
  components: HealthScoreComponents;
  trend7d: number;
  trend30d: number;
  computedAt: string;
}

export interface RiskAssessment {
  routineCollapseRisk: number;
  learningDisengagementRisk: number;
  parentChurnRisk: number;
  subscriptionChurnRisk: number;
  overallRisk: number;
  primaryRisk: ActionCategory;
}

export interface InterventionPlan {
  id: string;
  risk: ActionCategory;
  title: string;
  description: string;
  surfaces: ProductSurface[];
  priority: number;
  proactive: boolean;
}

export interface FamilyMoment {
  type: FamilyMomentType;
  title: string;
  description: string;
  childId: number | null;
  detectedAt: string;
  coordinatedActions: Array<{
    surface: ProductSurface;
    action: string;
  }>;
}

export interface DigitalTwin {
  strengths: string[];
  weaknesses: string[];
  habits: string[];
  learningStyle: string;
  engagementStyle: string;
  preferredTimes: string[];
  updatedAt: string;
}

export interface PrioritizedAction {
  rank: number;
  category: ActionCategory;
  title: string;
  description: string;
  primarySurface: ProductSurface;
  secondarySurfaces: ProductSurface[];
  valueScore: number;
  suppressOthers: boolean;
}

export interface WeeklyFamilyReport {
  weekKey: string;
  wins: string[];
  risks: string[];
  achievements: string[];
  recommendations: string[];
  healthScore: number;
  healthTrend: number;
}

export interface PredictiveIntervention {
  id: string;
  prediction: string;
  probability: number;
  recommendedAction: string;
  surfaces: ProductSurface[];
  expiresAt: string;
}

export interface FamilyGoal {
  id: string;
  type: FamilyGoalType;
  target: string;
  progress: number;
  targetValue: number;
  unit: string;
  active: boolean;
}

export interface SuccessMetrics {
  routineSuccess: number;
  learningSuccess: number;
  retentionSuccess: number;
  parentSatisfaction: number;
  childEngagement: number;
  overallSuccess: number;
}

export interface MemoryEntry {
  id: string;
  category: "intervention" | "notification" | "learning_style" | "reward_style";
  key: string;
  outcome: "positive" | "neutral" | "negative";
  context: string;
  recordedAt: string;
  confidenceScore?: number;
  sampleSize?: number;
  validatedAt?: string;
}

export interface OrchestrationPlan {
  notifications: { enabled: boolean; goal: string | null; priority: number };
  amyAi: { enabled: boolean; promptHint: string | null; priority: number };
  parentHub: { enabled: boolean; cardId: string | null; priority: number };
  rewards: { enabled: boolean; rewardType: string | null; priority: number };
  learningZone: { enabled: boolean; focusSubject: string | null; priority: number };
  events: { enabled: boolean; eventType: string | null; priority: number };
  subscriptions: { enabled: boolean; offerType: string | null; priority: number };
}

export interface FamilyIntelligenceSnapshot {
  userId: string;
  primaryChildId: number | null;
  childName: string;
  health: FamilyHealthScore;
  risks: RiskAssessment;
  interventionPlans: InterventionPlan[];
  moments: FamilyMoment[];
  digitalTwin: DigitalTwin;
  topAction: PrioritizedAction | null;
  allActions: PrioritizedAction[];
  weeklyReport: WeeklyFamilyReport;
  predictiveInterventions: PredictiveIntervention[];
  goals: FamilyGoal[];
  successMetrics: SuccessMetrics;
  memory: MemoryEntry[];
  orchestration: OrchestrationPlan;
  engineVersion: string;
  computedAt: string;
}

/** Input bundle assembled by API from existing subsystems. */
export interface FamilyIntelligenceInput {
  userId: string;
  primaryChildId: number | null;
  childName: string;
  timezone: string;
  localDate: string;
  isPremium: boolean;
  routineCompletionRate7d: number;
  weeklyRoutineConsistency: number;
  lessonsCompleted7d: number;
  lessonsCompletedTotal: number;
  weakSubjects: string[];
  strongSubjects: string[];
  currentStreakDays: number;
  streakBrokenDaysAgo: number | null;
  daysSinceLastActive: number;
  notificationsOpened7d: number;
  sessionsLast7d: number;
  accountAgeDays: number;
  churnRisk7d: number;
  churnRisk30d: number;
  sleepQualityAvg7d: number | null;
  screenMinutesAvg7d: number | null;
  completionPctAvg7d: number | null;
  parentGoals: string[];
  trustScore: number | null;
  dropOffRisk: number | null;
  healthHistory7d: number[];
  healthHistory30d: number[];
  activeGoals: FamilyGoal[];
  recentMemory: MemoryEntry[];
}
