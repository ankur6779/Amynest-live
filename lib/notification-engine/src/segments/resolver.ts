import { detectLifecycleStage } from "../lifecycle/lifecycle-stage.js";
import type { LifecycleStage, OutcomeSignals } from "../outcomes/types.js";
import type {
  AudienceSegment,
  BehavioralPremiumTrigger,
  SegmentResolution,
} from "./types.js";

const INACTIVE_THRESHOLD_DAYS = 3;
const ROUTINE_LIMIT_THRESHOLD = 3;
const SPEECH_LIMIT_SESSIONS = 5;
const MEAL_LIMIT_PLANS = 3;
const AI_LIMIT_INTERACTIONS = 10;

/**
 * Infer a behavioral premium trigger from usage signals.
 * Only returns non-none when the user has clearly hit a free-tier ceiling.
 */
export function inferBehavioralPremiumTrigger(s: OutcomeSignals): BehavioralPremiumTrigger {
  const activity = s.activity;
  const routines7d = activity?.routinesCompleted7d ?? 0;
  const speech7d = activity?.speechSessions7d ?? 0;
  const meals7d = activity?.nutritionPlans7d ?? 0;
  const coach7d = activity?.coachInteractions7d ?? 0;

  if (routines7d >= ROUTINE_LIMIT_THRESHOLD) return "routine_limit";
  if (speech7d >= SPEECH_LIMIT_SESSIONS) return "speech_limit";
  if (meals7d >= MEAL_LIMIT_PLANS) return "meal_limit";
  if (coach7d >= AI_LIMIT_INTERACTIONS) return "ai_limit";
  return "none";
}

function isExpiredPremium(s: OutcomeSignals): boolean {
  const sub = s.subscription;
  if (sub?.status === "expired") return true;
  if (sub?.everSubscribed && !s.isPremium && sub.status === "free") {
    return true;
  }
  return false;
}

function isPremiumActive(s: OutcomeSignals, stage: LifecycleStage): boolean {
  if (s.isPremium) return true;
  return (
    stage === "PREMIUM_SUBSCRIBER" ||
    stage === "TRIAL_USER" ||
    stage === "TRIAL_ENDING" ||
    stage === "SUBSCRIPTION_EXPIRING"
  );
}

/**
 * Resolve exactly one audience segment for a registered user.
 * Pre-signup (INSTALLED_NEVER_REGISTERED) is resolved separately via device registry.
 */
export function resolveAudienceSegment(
  signals: OutcomeSignals,
  lifecycleStage?: LifecycleStage,
): SegmentResolution {
  const stage = lifecycleStage ?? detectLifecycleStage(signals);
  const behavioralTrigger = inferBehavioralPremiumTrigger(signals);

  if (isExpiredPremium(signals)) {
    return {
      segment: "EXPIRED_PREMIUM",
      lifecycleStage: stage,
      behavioralTrigger,
      reason: "subscription_lapsed",
    };
  }

  if (signals.daysSinceLastActive >= INACTIVE_THRESHOLD_DAYS) {
    return {
      segment: "INACTIVE_USERS",
      lifecycleStage: stage,
      behavioralTrigger,
      reason: `inactive_${signals.daysSinceLastActive}d`,
    };
  }

  if (!signals.firstRoutineCompleted && signals.accountAgeDays >= 0) {
    const noRoutine =
      stage === "ONBOARDING" ||
      stage === "NEW_INSTALL" ||
      (!signals.firstRoutineCompleted && signals.accountAgeDays <= 14);
    if (noRoutine) {
      return {
        segment: "REGISTERED_NO_ROUTINE",
        lifecycleStage: stage,
        behavioralTrigger,
        reason: "no_first_routine",
      };
    }
  }

  if (isPremiumActive(signals, stage)) {
    return {
      segment: "PREMIUM_USERS",
      lifecycleStage: stage,
      behavioralTrigger,
      reason: "premium_active",
    };
  }

  if (behavioralTrigger !== "none" && !signals.isPremium) {
    return {
      segment: "FREE_BEHAVIORAL",
      lifecycleStage: stage,
      behavioralTrigger,
      reason: `behavior_${behavioralTrigger}`,
    };
  }

  return {
    segment: "REGISTERED_ACTIVE",
    lifecycleStage: stage,
    behavioralTrigger,
    reason: "active_registered",
  };
}

export function resolvePreSignupSegment(): SegmentResolution {
  return {
    segment: "INSTALLED_NEVER_REGISTERED",
    lifecycleStage: "NEW_INSTALL",
    behavioralTrigger: "none",
    reason: "device_never_signed_in",
  };
}
