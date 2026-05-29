import type {
  FamilyIntelligenceSnapshot,
  FamilyGoal,
  PrioritizedAction,
  PredictiveIntervention,
} from "@workspace/family-intelligence";

export type AmyCapability =
  | "planning"
  | "coaching"
  | "recommendations"
  | "explanations"
  | "interventions"
  | "goal_management";

export type RiskPlaybookId =
  | "routine_collapse"
  | "parent_churn"
  | "learning_disengagement"
  | "sleep_inconsistency";

export interface ExplainedRecommendation {
  title: string;
  description: string;
  why: string;
  confidence: "observation" | "prediction" | "high_confidence_prediction";
  uncertaintyNote?: string;
  surfaces: string[];
}

export interface DailyFamilyBriefing {
  localDate: string;
  greeting: string;
  wins: string[];
  risks: string[];
  progress: string[];
  recommendedActions: ExplainedRecommendation[];
  suggestedQuestions: string[];
  healthScore: number;
  healthTrend: string;
}

export interface WeeklyFamilyReview {
  weekKey: string;
  executiveSummary: string;
  learningProgress: string[];
  routineConsistency: string[];
  goalAchievement: string[];
  screenTimeTrends: string[];
  parentEngagement: string[];
  insights: string[];
  nextWeekFocus: string[];
}

export interface ProactiveAmyMessage {
  id: string;
  urgency: "low" | "medium" | "high";
  title: string;
  body: string;
  playbookId?: RiskPlaybookId;
  surfaces: string[];
  expiresAt: string;
}

export interface DecisionMemoryEntry {
  id: string;
  recommendationId: string;
  recommendationTitle: string;
  userResponse: "accepted" | "dismissed" | "ignored" | "completed";
  outcomeAchieved: boolean | null;
  recordedAt: string;
}

export interface GoalCoachState {
  goals: Array<FamilyGoal & { coachMessage: string; onTrack: boolean }>;
  overallProgress: number;
}

export interface InterventionPlaybook {
  id: RiskPlaybookId;
  title: string;
  triggerCondition: string;
  steps: Array<{ day: number; action: string; surface: string }>;
  successCriteria: string;
}

export interface TimelineEvent {
  id: string;
  eventType: "milestone" | "breakthrough" | "challenge" | "recovery";
  title: string;
  description: string;
  occurredAt: string;
}

export interface SuccessForecast {
  metric: string;
  likelihood: number;
  confidenceLow: number;
  confidenceHigh: number;
  horizonDays: number;
  narrative: string;
}

export interface KnowledgeGraphNode {
  id: string;
  type: "goal" | "habit" | "behavior" | "outcome" | "intervention";
  label: string;
}

export interface KnowledgeGraphEdge {
  from: string;
  to: string;
  relation: "drives" | "blocks" | "improves" | "predicts" | "resulted_in";
  weight: number;
}

export interface FamilyKnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface AmyExecutiveMode {
  narration: string;
  healthScore: number;
  risks: FamilyIntelligenceSnapshot["risks"];
  goals: GoalCoachState;
  predictions: SuccessForecast[];
  interventions: ProactiveAmyMessage[];
  weeklySummary: string;
  timeline: TimelineEvent[];
  orchestration: FamilyIntelligenceSnapshot["orchestration"];
}

export interface AmyOperatingContext {
  snapshot: FamilyIntelligenceSnapshot;
  capabilities: AmyCapability[];
  dailyBriefing: DailyFamilyBriefing;
  weeklyReview: WeeklyFamilyReview;
  proactiveMessages: ProactiveAmyMessage[];
  goalCoach: GoalCoachState;
  playbooks: InterventionPlaybook[];
  activePlaybook: InterventionPlaybook | null;
  knowledgeGraph: FamilyKnowledgeGraph;
  forecasts: SuccessForecast[];
  executiveMode: AmyExecutiveMode;
  systemPromptBlock: string;
  engineVersion: string;
}

export interface NlCommandResult {
  answer: string;
  sources: string[];
  confidence: "observation" | "prediction";
  relatedActions: PrioritizedAction[];
}
