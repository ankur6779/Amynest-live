import type { NotificationGoal, OutcomeSignals } from "../outcomes/types.js";
import type { LifecycleStage } from "../outcomes/types.js";

export interface ConversionLifecycleDraft {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  /** Stable identifier for the specific journey step (analytics + dedup). */
  trigger: string;
  /** Personalization fields actually used (for analytics transparency). */
  personalizationUsed: string[];
}

/**
 * Build premium-lifecycle notification copy for monetization stages.
 *
 * Every message is grounded in real user value (lessons, streaks, days left)
 * and never fabricates milestones or urgency. Returns null when the stage is
 * not a monetization moment or when required subscription signals are absent —
 * so it is safe to call for any user.
 */
export function buildConversionLifecycleCopy(
  stage: LifecycleStage,
  s: OutcomeSignals,
): ConversionLifecycleDraft | null {
  const sub = s.subscription;
  const name = safeName(s.childName);

  switch (stage) {
    case "HIGH_PURCHASE_INTENT":
      return highPurchaseIntent(s, name);
    case "TRIAL_USER":
      return trialActive(s, name);
    case "TRIAL_ENDING":
      return trialEnding(s, name);
    case "SUBSCRIPTION_EXPIRING":
      return subscriptionExpiring(s, name);
    default:
      // Winback for lapsed subscribers surfaces via inactivity stages, but a
      // canceled/expired free user who was ever premium gets a gentle winback.
      if (sub?.status === "expired" || (sub?.status === "canceled" && sub?.everSubscribed)) {
        return winback(s, name);
      }
      return null;
  }
}

function highPurchaseIntent(s: OutcomeSignals, name: string): ConversionLifecycleDraft {
  const used: string[] = ["childName"];
  const plan = s.subscription?.lastPlanViewed;
  const proof = valueProof(s, used);

  // Answer the hesitation, not just repeat the pitch.
  const body = proof
    ? `${proof} Premium keeps it all going for ${name}. Start with a 7-day free trial — cancel anytime.`
    : `Not sure yet? Try Premium free for 7 days and see the difference for ${name}. Cancel anytime.`;

  if (plan) used.push("lastPlanViewed");
  return {
    title: "Still thinking it over?",
    body,
    deepLink: plan ? `/pricing?plan=${encodeURIComponent(plan)}&source=notif_intent` : "/pricing?source=notif_intent",
    goal: "GOAL_SUBSCRIPTION",
    trigger: "paywall_viewed_no_purchase",
    personalizationUsed: used,
  };
}

function trialActive(s: OutcomeSignals, name: string): ConversionLifecycleDraft {
  const used: string[] = ["childName"];
  const proof = valueProof(s, used);
  const body = proof
    ? `${proof} There's more waiting in ${name}'s plan — make the most of your trial.`
    : `Explore everything in ${name}'s plan while your trial is active.`;
  return {
    title: `${name}'s trial is in full swing`,
    body,
    deepLink: "/dashboard?source=notif_trial",
    goal: "GOAL_LEARNING_COMPLETION",
    trigger: "trial_active",
    personalizationUsed: used,
  };
}

function trialEnding(s: OutcomeSignals, name: string): ConversionLifecycleDraft {
  const used: string[] = ["childName"];
  const days = s.subscription?.trialDaysRemaining;
  const proof = valueProof(s, used);

  let when = "soon";
  if (days != null) {
    used.push("trialDaysRemaining");
    if (days <= 0) when = "today";
    else if (days === 1) when = "tomorrow";
    else when = `in ${days} days`;
  }

  const body = proof
    ? `${proof} Keep ${name}'s momentum going — your trial ends ${when}.`
    : `Your trial ends ${when}. Keep ${name}'s plan and everything you've set up.`;

  return {
    title: `Keep ${name}'s progress going`,
    body,
    deepLink: "/pricing?source=notif_trial_ending",
    goal: "GOAL_SUBSCRIPTION",
    trigger: days != null ? `trial_ending_d${Math.max(0, days)}` : "trial_ending",
    personalizationUsed: used,
  };
}

function subscriptionExpiring(s: OutcomeSignals, name: string): ConversionLifecycleDraft {
  const used: string[] = ["childName"];
  const days = s.subscription?.subscriptionDaysRemaining;
  let when = "soon";
  if (days != null) {
    used.push("subscriptionDaysRemaining");
    when = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  }
  return {
    title: `${name}'s Premium is ending ${when}`,
    body: `Renew to keep ${name}'s personalized plans, insights, and saved progress.`,
    deepLink: "/pricing?source=notif_expiring",
    goal: "GOAL_RETENTION",
    trigger: days != null ? `expiring_d${Math.max(0, days)}` : "expiring",
    personalizationUsed: used,
  };
}

function winback(s: OutcomeSignals, name: string): ConversionLifecycleDraft {
  return {
    title: `${name}'s plan is still here`,
    body: `Come back anytime — ${name}'s progress is saved, right where you left it.`,
    deepLink: "/pricing?source=notif_winback",
    goal: "GOAL_REACTIVATION",
    trigger: "subscription_winback",
    personalizationUsed: ["childName"],
  };
}

/**
 * Build a concrete, honest value statement from real signals. Returns null
 * when there is nothing genuine to celebrate (so we never invent milestones).
 */
function valueProof(s: OutcomeSignals, used: string[]): string | null {
  if (s.currentStreakDays >= 3) {
    used.push("currentStreakDays");
    return `${safeName(s.childName)} is on a ${s.currentStreakDays}-day streak.`;
  }
  if (s.lessonsCompleted7d >= 3) {
    used.push("lessonsCompleted7d");
    return `${safeName(s.childName)} completed ${s.lessonsCompleted7d} lessons this week.`;
  }
  if (s.lessonsCompletedTotal >= 10) {
    used.push("lessonsCompletedTotal");
    return `${safeName(s.childName)} has completed ${s.lessonsCompletedTotal} lessons so far.`;
  }
  if (s.routineCompletionRate7d >= 0.5) {
    used.push("routineCompletionRate7d");
    return `${safeName(s.childName)} is keeping up with routines.`;
  }
  return null;
}

function safeName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : "your child";
}
