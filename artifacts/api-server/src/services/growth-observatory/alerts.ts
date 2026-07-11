import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { FunnelIntelStage, ObservatoryAlert } from "./types.js";

const ALERT_THRESHOLD_PCT = 10;
const MIN_USERS_FOR_ALERT = 15;

function isMeaningful(changePct: number | null, users: number): boolean {
  if (changePct == null) return false;
  if (Math.abs(changePct) < ALERT_THRESHOLD_PCT) return false;
  return users >= MIN_USERS_FOR_ALERT;
}

export function generateObservatoryAlerts(input: {
  funnel: FunnelIntelStage[];
  dashboard: GrowthDashboardPayload;
  startupFailureRate: number | null;
  purchaseFailureRate: number | null;
}): ObservatoryAlert[] {
  const alerts: ObservatoryAlert[] = [];

  const signup = input.funnel.find((f) => f.key === "signup");
  if (signup && isMeaningful(signup.trendVs7d, signup.users) && (signup.trendVs7d ?? 0) < 0) {
    alerts.push({
      id: "alert_signup_drop",
      category: "critical",
      metric: "signup_rate",
      title: "Signup volume declined",
      message: `Signup users changed ${signup.trendVs7d}% vs 7-day baseline.`,
      changePct: signup.trendVs7d,
      affectedUsers: signup.users,
      statisticallyMeaningful: true,
      evidence: `analytics_events: signup cohort n=${signup.users}`,
    });
  }

  const routine = input.funnel.find((f) => f.key === "routine_completed");
  if (routine && isMeaningful(routine.trendVs7d, routine.users) && (routine.trendVs7d ?? 0) < 0) {
    alerts.push({
      id: "alert_routine_drop",
      category: "critical",
      metric: "routine_completion",
      title: "Routine completion declined",
      message: `Routine completions changed ${routine.trendVs7d}% vs 7-day baseline.`,
      changePct: routine.trendVs7d,
      affectedUsers: routine.users,
      statisticallyMeaningful: true,
      evidence: `analytics_events: routine_generated + routine_generation_completed`,
    });
  }

  const d1 = input.dashboard.retention.summary.d1;
  const prevD1 = input.dashboard.kpis.dau?.changePct;
  if (d1 != null && d1 < 5) {
    alerts.push({
      id: "alert_d1_low",
      category: "warning",
      metric: "d1_retention",
      title: "D1 retention below 5%",
      message: `Current D1 retention is ${d1}% in the selected window.`,
      changePct: prevD1,
      affectedUsers: input.dashboard.kpis.dau?.value ?? 0,
      statisticallyMeaningful: (input.dashboard.kpis.dau?.value ?? 0) >= MIN_USERS_FOR_ALERT,
      evidence: "analytics_events: cohort_day + 1 activity",
    });
  }

  const trials = input.dashboard.kpis.trialsStarted;
  if (isMeaningful(trials.changePct, trials.value ?? 0) && (trials.changePct ?? 0) < 0) {
    alerts.push({
      id: "alert_trial_drop",
      category: "warning",
      metric: "trial_conversion",
      title: "Trial starts decreased",
      message: `Trial starts changed ${trials.changePct}% vs prior period.`,
      changePct: trials.changePct,
      affectedUsers: trials.value ?? 0,
      statisticallyMeaningful: true,
      evidence: "subscriptions + subscription_funnel_event trial_started",
    });
  }

  if (input.purchaseFailureRate != null && input.purchaseFailureRate > 20) {
    alerts.push({
      id: "alert_purchase_fail",
      category: "critical",
      metric: "purchase_success",
      title: "Purchase failure rate elevated",
      message: `Purchase failure rate is ${input.purchaseFailureRate}% in window.`,
      changePct: null,
      affectedUsers: 0,
      statisticallyMeaningful: true,
      evidence: "subscription_funnel_event purchase_failed vs purchase_success",
    });
  }

  const crashFree = input.dashboard.performance.crashFreePct;
  if (crashFree != null && crashFree < 97) {
    alerts.push({
      id: "alert_crash_rate",
      category: "critical",
      metric: "crash_free",
      title: "Crash-free rate below target",
      message: `Crash-free rate is ${crashFree}% (target ≥97%).`,
      changePct: input.dashboard.kpis.crashFreePct?.changePct ?? null,
      affectedUsers: input.dashboard.kpis.appOpens?.value ?? 0,
      statisticallyMeaningful: true,
      evidence: "crash_events vs app_open",
    });
  }

  if (input.startupFailureRate != null && input.startupFailureRate > 5) {
    alerts.push({
      id: "alert_startup_fail",
      category: "warning",
      metric: "startup_failure",
      title: "Startup failure rate elevated",
      message: `Startup failure rate is ${input.startupFailureRate}% from startup_funnel_events.`,
      changePct: null,
      affectedUsers: 0,
      statisticallyMeaningful: true,
      evidence: "startup_funnel_events failure events",
    });
  }

  const apiErrors = input.dashboard.performance.networkErrors;
  if (apiErrors > 10) {
    alerts.push({
      id: "alert_api_errors",
      category: "warning",
      metric: "api_failure",
      title: "API/network errors increased",
      message: `${apiErrors} network error events in window.`,
      changePct: null,
      affectedUsers: apiErrors,
      statisticallyMeaningful: apiErrors >= MIN_USERS_FOR_ALERT,
      evidence: "analytics_events error + network_error",
    });
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.category] - order[b.category];
  });
}
