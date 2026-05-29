/** Client mirror of GET /api/amy/hub-dashboard — keep in sync with @workspace/amy-operating-layer hub-dashboard.ts */

export interface HubRoutedAction {
  actionTarget: string;
  entityId?: string | number | null;
  href: string;
  fallbackTarget: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export interface HubPrimaryAction {
  id: string;
  title: string;
  description: string;
  why: string;
  href: string;
  surface: string;
  action: HubRoutedAction;
}

export interface HubAmyRecommendation {
  title: string;
  why: string;
  suggestedQuestion: string;
  action: HubRoutedAction;
}

export interface HubActiveCampaign {
  id: string;
  title: string;
  subtitle: string;
  progressPct: number;
  currentStep: number;
  totalSteps: number;
  action: HubRoutedAction;
}

export interface HubMetricCard {
  label: string;
  pct: number;
  action: HubRoutedAction;
}

export interface HubGoalCoachState {
  goals: Array<{
    id: string;
    type: string;
    target: string;
    progress: number;
    targetValue: number;
    unit: string;
    active: boolean;
    coachMessage: string;
    onTrack: boolean;
  }>;
  overallProgress: number;
}

export interface HubTimelineHighlight {
  id: string;
  eventType: "milestone" | "breakthrough" | "challenge" | "recovery";
  title: string;
  description: string;
  occurredAt: string;
}

export interface HubDashboardData {
  childName: string;
  computedAt: string;
  healthScore: number;
  healthTrend7d: number;
  healthTrendLabel: string;
  narration: string;
  primaryAction: HubPrimaryAction | null;
  weeklyWins: string[];
  currentRisks: string[];
  goals: HubGoalCoachState;
  learningProgressPct: number;
  routineConsistencyPct: number;
  learningMetric: HubMetricCard;
  routineMetric: HubMetricCard;
  familyHealthAction: HubRoutedAction;
  amyRecommendation: HubAmyRecommendation;
  activeCampaigns: HubActiveCampaign[];
  timelineHighlights: HubTimelineHighlight[];
  suggestedQuestions: string[];
  engineVersion: string;
}

export type HubDashboardSection =
  | "wins"
  | "risks"
  | "goals"
  | "campaigns"
  | "timeline";
