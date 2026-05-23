import type { AgeBand, CountryCode, ModuleId } from "../src/types.js";
import type {
  DailyPlanV2,
  DifficultyLevel,
  LearningProfile,
} from "../src/types-v2.js";
import type { PersonalityProfile, PersonalityTraits } from "../src/ml/types-personality.js";
import type { PredictionOutput } from "../src/ml/types-prediction.js";
import type { RealtimeEvent, RealtimeDecisionAction } from "../src/realtime/types.js";
import type { EnrichedRealtimeDecision } from "../src/ml/types.js";

export type SimChildArchetype =
  | "fast_curiosity"
  | "slow_distractible"
  | "persistent_avg"
  | "bored_low_engagement"
  | "chaotic"
  | "plateau_learner";

export type SimChildConfig = {
  id: string;
  label: string;
  archetype: SimChildArchetype;
  ageMonths: number;
  countryCode: CountryCode;
  /** 0–1 completion probability per content */
  completionRate: number;
  skipRate: number;
  idleRate: number;
  mistakeRate: number;
  responseTimeMs: { min: number; max: number };
  engagementBias: number;
};

export type SimDecisionSample = {
  source: "ml" | "rule";
  reward: number;
  adjustedReward: number;
  action: string;
  contextKey: string;
};

export type SessionTrace = {
  sessionIndex: number;
  plan: DailyPlanV2;
  events: RealtimeEvent[];
  decisions: EnrichedRealtimeDecision[];
  adaptationEvents: number[];
  /** Events from first negative signal until first non-NOOP adaptation. */
  adaptationLatencies: number[];
  /** Simulated ms from negative signal to adaptation (latency mode). */
  adaptationDelayMs: number[];
  overreactionFlags: boolean[];
  underreactionFlag: boolean;
  noisyEventCount: number;
  burstNoiseApplied: boolean;
  burstStabilityOk: boolean;
  decisionSamples: SimDecisionSample[];
  coherenceScore: number;
  contentIds: string[];
  tutorTurnSequence: string[];
  recommendedDifficulty: DifficultyLevel;
  negativeSignalCountBeforeAdapt: number | null;
  sessionEngagement: number;
  sessionDropOffRisk: number;
};

export type ChildSimulationResult = {
  config: SimChildConfig;
  ageBand: AgeBand;
  sessions: SessionTrace[];
  finalProfile: LearningProfile;
  finalPersonality: PersonalityProfile;
  personalitySnapshots: PersonalityTraits[];
  mlDecisions: number;
  ruleDecisions: number;
  sessionRewards: number[];
  predictions: PredictionOutput[];
  tutorModes: string[];
  tutorMessages: string[];
  difficultyLevels: DifficultyLevel[];
  tutorTurnSequence: string[];
  /** Decisions that correlate with personality traits (exploration, shorten, difficulty). */
  personalityInfluencedDecisions: number;
  totalAdaptiveDecisions: number;
};

export type MlVsRuleBreakdown = {
  ml: number;
  rule: number;
};

export type SimMlMode = "aggressive" | "balanced" | "conservative";

export type SimMlModeConfig = {
  mode: SimMlMode;
  label: string;
  mlConfidenceThreshold: number;
};

export type MlRewardBreakdown = {
  mlRewardSum: number;
  mlRewardCount: number;
  ruleRewardSum: number;
  ruleRewardCount: number;
  mlAdjustedSum: number;
  mlAdjustedCount: number;
  ruleAdjustedSum: number;
  ruleAdjustedCount: number;
};

export type OptimizationComparison = {
  baselineEngagement: number;
  optimizedEngagement: number;
  baselineReward: number;
  optimizedReward: number;
  baselineDropOff: number;
  optimizedDropOff: number;
  baselineCoherence: number;
  optimizedCoherence: number;
  baselineOscillation: number;
  optimizedOscillation: number;
  stabilityDelta: number;
  oscillationDelta: number;
  improved: boolean;
  coherenceStable: boolean;
  uxStable: boolean;
};

export type MultiModeSimulationResult = {
  aggressive: FullSimulationResult;
  balanced: FullSimulationResult;
  conservative: FullSimulationResult;
  durationMs: number;
};

export type FamilySimulationSlice = {
  familyId: string;
  childIds: string[];
  hasSiblingInfluence: boolean;
  hasInternalComparisonOnly: boolean;
  explorationBoostApplied: boolean;
};

export type MetaSimulationSlice = {
  initialExplorationRate: number;
  finalExplorationRate: number;
  cyclesRun: number;
  experimentsCreated: boolean;
  modelLifecycleRan: boolean;
};

export type GlobalSimulationSlice = {
  coldStartPathLength: number;
  rankingBoostApplied: boolean;
};

export type FullSimulationResult = {
  children: ChildSimulationResult[];
  family: FamilySimulationSlice;
  global: GlobalSimulationSlice;
  meta: MetaSimulationSlice;
  mlVsRuleBreakdown: MlVsRuleBreakdown;
  mlRewardBreakdown: MlRewardBreakdown;
  mlMode: SimMlMode;
  injectNoise: boolean;
  simulateLatency: boolean;
  burstNoiseMode: boolean;
  noiseEventCount: number;
  decisionSamples: SimDecisionSample[];
  optimizationEnabled: boolean;
  optimizationComparison?: OptimizationComparison;
  startedAt: string;
  durationMs: number;
};

export type LayerStatus = "pass" | "fail" | "warn";

export type LayerValidationResult = {
  layer: string;
  status: LayerStatus;
  message: string;
  details?: string[];
  suggestions?: string[];
};

export type SystemMetrics = {
  avgEngagementScore: number;
  avgRewardTrend: number;
  mlUsageRatio: number;
  mlVsRuleBreakdown: MlVsRuleBreakdown;
  predictionError: number;
  directionAccuracy: number;
  avgAdaptationLatency: number;
  overreactionRate: number;
  traitStability: number;
  coherenceScore: number;
  dropOffReductionPct: number;
  explorationEffectiveness: number;
  mlAccuracy: number;
  mlLift: number;
  underreactionRate: number;
  stabilityDelta: number;
  personalityImpactScore: number;
  noiseRobustnessScore: number;
  difficultyAdjustedLift: number;
  decisionConsistencyScore: number;
  avgAdaptationDelayMs: number;
  burstNoiseStabilityScore: number;
  uxScore: number;
  rewardVariance: number;
};

export type FailureFlag = {
  code: string;
  message: string;
  severity: "warning" | "critical";
};

export type SystemValidationReport = {
  overall: "PASS" | "FAIL";
  layers: LayerValidationResult[];
  metrics: SystemMetrics;
  flags: FailureFlag[];
  suggestions: string[];
  simulation: FullSimulationResult;
};
