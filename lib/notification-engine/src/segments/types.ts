import type { LifecycleStage, OutcomeSignals } from "../outcomes/types.js";

/** Exactly one audience segment per notification decision. */
export type AudienceSegment =
  | "REGISTERED_ACTIVE"
  | "INSTALLED_NEVER_REGISTERED"
  | "REGISTERED_NO_ROUTINE"
  | "INACTIVE_USERS"
  | "FREE_BEHAVIORAL"
  | "PREMIUM_USERS"
  | "EXPIRED_PREMIUM";

export type BehavioralPremiumTrigger =
  | "routine_limit"
  | "speech_limit"
  | "meal_limit"
  | "ai_limit"
  | "none";

export interface SegmentResolution {
  segment: AudienceSegment;
  lifecycleStage: LifecycleStage;
  behavioralTrigger: BehavioralPremiumTrigger;
  /** Human-readable reason for analytics/debugging. */
  reason: string;
}

export interface JourneyStepDefinition {
  stepId: string;
  /** Hours after segment entry (or install for pre-signup). */
  delayHours: number;
  titleKey: string;
  bodyKey: string;
  defaultTitle: string;
  defaultBody: string;
  deepLink: string;
  /** engagement = value-first; conversion = premium upsell (segment-gated). */
  category: "engagement" | "conversion";
  emoji?: string;
  goal: string;
  /** Skip if user already completed the target action. */
  skipIf?: (signals: OutcomeSignals) => boolean;
}

export interface JourneyDefinition {
  journeyId: string;
  segment: AudienceSegment;
  steps: JourneyStepDefinition[];
}

export interface SegmentPersonalization {
  childName: string;
  childAgeYears: number | null;
  isPremium: boolean;
  routineStatus: "none" | "created" | "active";
  lastActivityDays: number;
  locale: string;
  timezone: string;
}

export interface BuiltSegmentNotification {
  title: string;
  body: string;
  deepLink: string;
  dedupKey: string;
  category: "engagement" | "insights" | "routine";
  journeyId: string;
  stepId: string;
  stepIndex: number;
  segment: AudienceSegment;
  goal: string;
  monetization: boolean;
  critical: boolean;
  data: Record<string, unknown>;
}

export type CrmDecisionAction = "send" | "delay" | "skip";

export interface CrmDecision {
  action: CrmDecisionAction;
  reason: string;
  expectedValue: number;
  factors: string[];
  segment: AudienceSegment;
  journeyStepId?: string;
}

export interface SegmentRemoteConfig {
  enabled: boolean;
  maxNonCriticalPerDay: number;
  morningHourLocal: number;
  eveningHourLocal: number;
  copy: Record<string, { title?: string; body?: string; emoji?: string }>;
  journeysEnabled: Partial<Record<AudienceSegment, boolean>>;
  abVariant: string;
}

export const DEFAULT_SEGMENT_REMOTE_CONFIG: SegmentRemoteConfig = {
  enabled: false,
  maxNonCriticalPerDay: 2,
  morningHourLocal: 8,
  eveningHourLocal: 18,
  copy: {},
  journeysEnabled: {
    REGISTERED_ACTIVE: true,
    INSTALLED_NEVER_REGISTERED: true,
    REGISTERED_NO_ROUTINE: true,
    INACTIVE_USERS: true,
    FREE_BEHAVIORAL: true,
    PREMIUM_USERS: true,
    EXPIRED_PREMIUM: true,
  },
  abVariant: "control",
};
