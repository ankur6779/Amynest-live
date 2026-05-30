import { queueClientLog } from "@/lib/client-logs";

const INFANT_NOTIF_PREFS_KEY = "amynest:infant-notification-prefs";

// ─── Product analytics types ───────────────────────────────────────────────────

export type InfantHubSource = "dashboard" | "parenting_hub" | "deep_link" | "notification";

export type InfantAnalyticsAgeBand = "0-3" | "4-6" | "7-12" | "13-24";

export type BabyTodayCtaType =
  | "view_plan"
  | "log_feed"
  | "log_sleep"
  | "log_diaper"
  | "cry_insight";

export type FeedType = "breast" | "bottle" | "solids";

export type DiaperType = "wet" | "dirty" | "mixed";

export type GrowthMeasurementType = "weight" | "height" | "head_circumference";

export type SleepType = "nap" | "night";

export type WeeklyReportShareMethod = "whatsapp" | "image" | "pdf" | "system_share";

export type DoctorReportExportType = "pdf" | "print";

export type CoParentRelationshipType = "co_parent" | "partner" | "caregiver";

export type InfantFunnelStep =
  | "infant_hub_opened"
  | "baby_today_viewed"
  | "first_log_created"
  | "cry_analysis_completed"
  | "weekly_report_viewed";

export type InfantAnalyticsEventName =
  | InfantFunnelStep
  | "infant_funnel_progress"
  | "baby_today_cta_clicked"
  | "cry_recording_started"
  | "cry_recording_completed"
  | "cry_analysis_failed"
  | "sleep_prediction_viewed"
  | "sleep_log_added"
  | "feed_logged"
  | "feeding_history_viewed"
  | "diaper_logged"
  | "burp_logged"
  | "growth_measurement_added"
  | "growth_chart_viewed"
  | "milestone_viewed"
  | "milestone_completed"
  | "weekly_report_shared"
  | "doctor_report_generated"
  | "doctor_report_exported"
  | "wellbeing_checkin_completed"
  | "breathing_exercise_started"
  | "breathing_exercise_completed"
  | "coparent_invite_started"
  | "coparent_invite_sent"
  | "coparent_invite_accepted"
  | "infant_dashboard_shortcut_tapped"
  | "infant_hub_shortcut_tapped"
  | "infant_notification_sent"
  | "infant_notification_opened"
  | "infant_notification_dismissed"
  | "infant_activation_started"
  | "infant_activation_step_completed"
  | "infant_activation_completed";

export type InfantUserProperties = {
  childAgeMonths: number;
  infantAgeBand: InfantAnalyticsAgeBand;
  hasCoParent: boolean;
  notificationsEnabled: boolean;
  hasGrowthData: boolean;
  hasCryHistory: boolean;
};

export type InfantAnalyticsDebugEntry = {
  event: InfantAnalyticsEventName;
  timestamp: string;
  payload: Record<string, unknown>;
  success: boolean;
};

export interface InfantAnalyticsAdapter {
  track(event: InfantAnalyticsEventName, properties: Record<string, unknown>): void;
  identify?(userId: string | undefined, properties: InfantUserProperties): void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const VIEW_DEBOUNCE_MS = 30_000;
const ENTRY_SOURCE_KEY = "amynest:infant-hub-entry-source";
const USER_PROPS_PREFIX = "amynest:infant-user-props:";
const FUNNEL_PREFIX = "amynest:infant-funnel:";
const FIRST_LOG_PREFIX = "amynest:infant-first-log:";

const viewDebouncers = new Map<string, number>();
const sessionViewKeys = new Set<string>();
const debugLog: InfantAnalyticsDebugEntry[] = [];
const debugListeners = new Set<(entry: InfantAnalyticsDebugEntry) => void>();
const adapters: InfantAnalyticsAdapter[] = [];

const FUNNEL_ORDER: InfantFunnelStep[] = [
  "infant_hub_opened",
  "baby_today_viewed",
  "first_log_created",
  "cry_analysis_completed",
  "weekly_report_viewed",
];

function clientLogAdapter(): InfantAnalyticsAdapter {
  return {
    track(event, properties) {
      queueClientLog({
        type: "infant_parenting",
        message: event,
        context: "infant_parenting",
        meta: { event, ...properties },
      });
    },
  };
}

adapters.push(clientLogAdapter());

export function registerInfantAnalyticsAdapter(adapter: InfantAnalyticsAdapter): void {
  adapters.push(adapter);
}

export function getInfantAnalyticsAgeBand(ageMonths: number): InfantAnalyticsAgeBand {
  if (ageMonths <= 3) return "0-3";
  if (ageMonths <= 6) return "4-6";
  if (ageMonths <= 12) return "7-12";
  return "13-24";
}

function basePayload(childId: number, ageMonths: number): Record<string, unknown> {
  return {
    childId,
    childAgeMonths: ageMonths,
    infantAgeBand: getInfantAnalyticsAgeBand(ageMonths),
    at: new Date().toISOString(),
    userProperties: getInfantUserProperties(childId, ageMonths),
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent */
  }
}

function shouldEmitViewEvent(key: string, oncePerSession = true): boolean {
  if (oncePerSession && sessionViewKeys.has(key)) return false;
  const last = viewDebouncers.get(key) ?? 0;
  const now = Date.now();
  if (now - last < VIEW_DEBOUNCE_MS) return false;
  viewDebouncers.set(key, now);
  if (oncePerSession) sessionViewKeys.add(key);
  return true;
}

function recordDebug(
  event: InfantAnalyticsEventName,
  payload: Record<string, unknown>,
  success: boolean,
): void {
  if (!import.meta.env.DEV) return;
  const entry: InfantAnalyticsDebugEntry = {
    event,
    timestamp: new Date().toISOString(),
    payload,
    success,
  };
  debugLog.unshift(entry);
  if (debugLog.length > 100) debugLog.pop();
  debugListeners.forEach((listener) => {
    try {
      listener(entry);
    } catch {
      /* silent */
    }
  });
  console.info("[infant-analytics]", entry);
}

function dispatch(
  event: InfantAnalyticsEventName,
  properties: Record<string, unknown>,
): void {
  try {
    for (const adapter of adapters) {
      try {
        adapter.track(event, properties);
      } catch {
        /* silent per adapter */
      }
    }
    recordDebug(event, properties, true);
  } catch {
    recordDebug(event, properties, false);
  }
}

function trackEvent(
  event: InfantAnalyticsEventName,
  childId: number,
  ageMonths: number,
  extra?: Record<string, unknown>,
): void {
  dispatch(event, { ...basePayload(childId, ageMonths), ...extra });
}

function trackViewEvent(
  event: InfantAnalyticsEventName,
  childId: number,
  ageMonths: number,
  viewKey: string,
  extra?: Record<string, unknown>,
): void {
  if (!shouldEmitViewEvent(viewKey)) return;
  trackEvent(event, childId, ageMonths, extra);
  recordFunnelStep(childId, event as InfantFunnelStep);
}

function recordFunnelStep(childId: number, step: InfantFunnelStep): void {
  if (!FUNNEL_ORDER.includes(step)) return;
  const key = `${FUNNEL_PREFIX}${childId}`;
  const state = readJson<{ steps: Record<string, number>; hubOpenedAt?: number }>(key, { steps: {} });
  if (state.steps[step]) return;

  const stepIndex = FUNNEL_ORDER.indexOf(step);
  const previousStep = stepIndex > 0 ? FUNNEL_ORDER[stepIndex - 1] : undefined;
  const now = Date.now();
  const previousAt = previousStep ? state.steps[previousStep] : undefined;
  if (step === "infant_hub_opened") state.hubOpenedAt = now;

  state.steps[step] = now;
  writeJson(key, state);

  dispatch("infant_funnel_progress", {
    childId,
    funnelStep: step,
    funnelStepNumber: stepIndex + 1,
    previousStep: previousStep ?? null,
    msSincePreviousStep: previousAt != null ? now - previousAt : null,
    msSinceHubOpen: state.hubOpenedAt != null ? now - state.hubOpenedAt : null,
    at: new Date().toISOString(),
  });
}

function markFirstLogIfNeeded(childId: number, ageMonths: number): void {
  const key = `${FIRST_LOG_PREFIX}${childId}`;
  if (readJson<boolean>(key, false)) return;
  writeJson(key, true);
  updateInfantUserProperties(childId, ageMonths, {});
  trackEvent("first_log_created", childId, ageMonths);
  recordFunnelStep(childId, "first_log_created");
}

// ─── Entry source ──────────────────────────────────────────────────────────────

export function setInfantHubEntrySource(source: InfantHubSource): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ENTRY_SOURCE_KEY, source);
  } catch {
    /* silent */
  }
}

export function consumeInfantHubEntrySource(): InfantHubSource {
  if (typeof window === "undefined") return "parenting_hub";
  try {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "notification") return "notification";
    if (hash.startsWith("infant-") || hash.startsWith("tile-infant")) return "deep_link";
    const stored = sessionStorage.getItem(ENTRY_SOURCE_KEY) as InfantHubSource | null;
    if (stored) {
      sessionStorage.removeItem(ENTRY_SOURCE_KEY);
      return stored;
    }
  } catch {
    /* silent */
  }
  return "parenting_hub";
}

// ─── User properties ───────────────────────────────────────────────────────────

function readNotificationPrefsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(INFANT_NOTIF_PREFS_KEY);
    const prefs = raw
      ? (JSON.parse(raw) as Record<string, boolean>)
      : {
          napReminders: true,
          feedReminders: true,
          vaccineReminders: true,
          milestoneTips: true,
          sleepDrift: false,
        };
    return Object.values(prefs).some(Boolean);
  } catch {
    return false;
  }
}

export function getInfantUserProperties(
  childId: number,
  ageMonths?: number,
): Partial<InfantUserProperties> {
  const stored = readJson<Partial<InfantUserProperties>>(`${USER_PROPS_PREFIX}${childId}`, {});
  const months = ageMonths ?? stored.childAgeMonths ?? 0;
  const notificationsEnabled = readNotificationPrefsEnabled();

  return {
    childAgeMonths: months,
    infantAgeBand: getInfantAnalyticsAgeBand(months),
    notificationsEnabled,
    ...stored,
  };
}

export function updateInfantUserProperties(
  childId: number,
  ageMonths: number,
  patch: Partial<Omit<InfantUserProperties, "childAgeMonths" | "infantAgeBand">>,
): void {
  const key = `${USER_PROPS_PREFIX}${childId}`;
  const current = getInfantUserProperties(childId, ageMonths);
  const next: InfantUserProperties = {
    childAgeMonths: ageMonths,
    infantAgeBand: getInfantAnalyticsAgeBand(ageMonths),
    hasCoParent: patch.hasCoParent ?? current.hasCoParent ?? false,
    notificationsEnabled: patch.notificationsEnabled ?? current.notificationsEnabled ?? false,
    hasGrowthData: patch.hasGrowthData ?? current.hasGrowthData ?? false,
    hasCryHistory: patch.hasCryHistory ?? current.hasCryHistory ?? false,
  };
  writeJson(key, next);
  for (const adapter of adapters) {
    try {
      adapter.identify?.(undefined, next);
    } catch {
      /* silent */
    }
  }
}

// ─── Debug panel API ───────────────────────────────────────────────────────────

export function subscribeInfantAnalyticsDebug(
  listener: (entry: InfantAnalyticsDebugEntry) => void,
): () => void {
  debugListeners.add(listener);
  return () => debugListeners.delete(listener);
}

export function getInfantAnalyticsDebugLog(): InfantAnalyticsDebugEntry[] {
  return [...debugLog];
}

export function clearInfantAnalyticsDebugLog(): void {
  debugLog.length = 0;
}

// ─── Hub discovery ─────────────────────────────────────────────────────────────

export function trackInfantHubOpened(childId: number, ageMonths: number, source?: InfantHubSource): void {
  const resolvedSource = source ?? consumeInfantHubEntrySource();
  updateInfantUserProperties(childId, ageMonths, {});
  trackViewEvent("infant_hub_opened", childId, ageMonths, `hub_open:${childId}`, { source: resolvedSource });
}

export function trackInfantDashboardShortcutTapped(childId: number, ageMonths: number): void {
  setInfantHubEntrySource("dashboard");
  trackEvent("infant_dashboard_shortcut_tapped", childId, ageMonths);
}

export function trackInfantHubShortcutTapped(
  childId: number,
  ageMonths: number,
  section: string,
): void {
  setInfantHubEntrySource("deep_link");
  trackEvent("infant_hub_shortcut_tapped", childId, ageMonths, { section });
}

// ─── Baby Today ────────────────────────────────────────────────────────────────

export function trackBabyTodayViewed(
  childId: number,
  ageMonths: number,
  props: { sleepScore?: string; hasUpcomingVaccine?: boolean; hasCareLogs?: boolean; surface?: string },
): void {
  trackViewEvent("baby_today_viewed", childId, ageMonths, `baby_today:${childId}:${props.surface ?? "hub"}`, props);
}

export function trackBabyTodayCtaClicked(
  childId: number,
  ageMonths: number,
  ctaType: BabyTodayCtaType,
): void {
  trackEvent("baby_today_cta_clicked", childId, ageMonths, { ctaType });
}

// ─── Cry Insight ─────────────────────────────────────────────────────────────

export function trackCryRecordingStarted(childId: number, ageMonths: number): void {
  trackEvent("cry_recording_started", childId, ageMonths);
}

export function trackCryRecordingCompleted(
  childId: number,
  ageMonths: number,
  recordingLengthSeconds: number,
): void {
  trackEvent("cry_recording_completed", childId, ageMonths, { recordingLengthSeconds });
}

export function trackCryAnalysisCompleted(
  childId: number,
  ageMonths: number,
  props: { likelyCause: string; confidence: number },
): void {
  updateInfantUserProperties(childId, ageMonths, { hasCryHistory: true });
  trackEvent("cry_analysis_completed", childId, ageMonths, props);
  recordFunnelStep(childId, "cry_analysis_completed");
}

export function trackCryAnalysisFailed(
  childId: number,
  ageMonths: number,
  errorType: string,
): void {
  trackEvent("cry_analysis_failed", childId, ageMonths, { errorType });
}

// ─── Sleep ─────────────────────────────────────────────────────────────────────

export function trackSleepPredictionViewed(childId: number, ageMonths: number): void {
  trackViewEvent("sleep_prediction_viewed", childId, ageMonths, `sleep_predict:${childId}`);
}

export function trackSleepLogAdded(
  childId: number,
  ageMonths: number,
  props: { durationMinutes?: number; sleepType: SleepType },
): void {
  markFirstLogIfNeeded(childId, ageMonths);
  trackEvent("sleep_log_added", childId, ageMonths, props);
}

// ─── Feeding ───────────────────────────────────────────────────────────────────

export function trackFeedLogged(childId: number, ageMonths: number, feedType: FeedType): void {
  markFirstLogIfNeeded(childId, ageMonths);
  trackEvent("feed_logged", childId, ageMonths, { feedType });
}

export function trackFeedingHistoryViewed(childId: number, ageMonths: number): void {
  trackViewEvent("feeding_history_viewed", childId, ageMonths, `feeding_history:${childId}`);
}

// ─── Diaper & burp ─────────────────────────────────────────────────────────────

export function trackDiaperLogged(childId: number, ageMonths: number, diaperType: DiaperType): void {
  markFirstLogIfNeeded(childId, ageMonths);
  trackEvent("diaper_logged", childId, ageMonths, { diaperType });
}

export function trackBurpLogged(childId: number, ageMonths: number): void {
  markFirstLogIfNeeded(childId, ageMonths);
  trackEvent("burp_logged", childId, ageMonths);
}

// ─── Growth ────────────────────────────────────────────────────────────────────

export function trackGrowthMeasurementAdded(
  childId: number,
  ageMonths: number,
  measurementTypes: GrowthMeasurementType[],
): void {
  updateInfantUserProperties(childId, ageMonths, { hasGrowthData: true });
  for (const measurementType of measurementTypes) {
    trackEvent("growth_measurement_added", childId, ageMonths, { measurementType });
  }
}

export function trackGrowthChartViewed(childId: number, ageMonths: number): void {
  trackViewEvent("growth_chart_viewed", childId, ageMonths, `growth_chart:${childId}`);
}

// ─── Milestones ────────────────────────────────────────────────────────────────

export function trackMilestoneViewed(
  childId: number,
  ageMonths: number,
  props: { milestoneId: string; category?: string },
): void {
  trackEvent("milestone_viewed", childId, ageMonths, props);
}

export function trackMilestoneCompleted(
  childId: number,
  ageMonths: number,
  props: { milestoneId: string; category?: string },
): void {
  trackEvent("milestone_completed", childId, ageMonths, props);
}

// ─── Weekly report ─────────────────────────────────────────────────────────────

export function trackWeeklyReportViewed(childId: number, ageMonths: number, weekKey?: string): void {
  trackViewEvent("weekly_report_viewed", childId, ageMonths, `weekly_report:${childId}:${weekKey ?? "current"}`, {
    weekKey,
  });
}

export function trackWeeklyReportShared(
  childId: number,
  ageMonths: number,
  shareMethod: WeeklyReportShareMethod,
): void {
  trackEvent("weekly_report_shared", childId, ageMonths, { shareMethod });
}

// ─── Doctor report ─────────────────────────────────────────────────────────────

export function trackDoctorReportGenerated(childId: number, ageMonths: number): void {
  trackEvent("doctor_report_generated", childId, ageMonths);
}

export function trackDoctorReportExported(
  childId: number,
  ageMonths: number,
  exportType: DoctorReportExportType,
): void {
  trackEvent("doctor_report_exported", childId, ageMonths, { exportType });
}

// ─── Parent wellbeing ──────────────────────────────────────────────────────────

export function trackWellbeingCheckinCompleted(
  childId: number,
  ageMonths: number,
  props: { energyLevel: number; stressLevel: number },
): void {
  trackEvent("wellbeing_checkin_completed", childId, ageMonths, props);
}

export function trackBreathingExerciseStarted(childId: number, ageMonths: number): void {
  trackEvent("breathing_exercise_started", childId, ageMonths);
}

export function trackBreathingExerciseCompleted(childId: number, ageMonths: number): void {
  trackEvent("breathing_exercise_completed", childId, ageMonths);
}

// ─── Co-parent ─────────────────────────────────────────────────────────────────

export function trackCoParentInviteStarted(childId: number, ageMonths: number): void {
  trackEvent("coparent_invite_started", childId, ageMonths);
}

export function trackCoParentInviteSent(
  childId: number,
  ageMonths: number,
  relationshipType: CoParentRelationshipType = "co_parent",
): void {
  trackEvent("coparent_invite_sent", childId, ageMonths, { relationshipType });
}

export function trackCoParentInviteAccepted(
  childId: number,
  ageMonths: number,
  relationshipType: CoParentRelationshipType = "co_parent",
): void {
  updateInfantUserProperties(childId, ageMonths, { hasCoParent: true });
  trackEvent("coparent_invite_accepted", childId, ageMonths, { relationshipType });
}

// ─── Smart notifications ───────────────────────────────────────────────────────

export type InfantNotificationAnalyticsKind =
  | "nap_window"
  | "feed_reminder"
  | "vaccine_due"
  | "milestone_tip"
  | "sleep_drift";

export function trackInfantNotificationSent(
  childId: number,
  ageMonths: number,
  kind: InfantNotificationAnalyticsKind,
): void {
  trackEvent("infant_notification_sent", childId, ageMonths, { kind });
}

export function trackInfantNotificationOpened(
  childId: number,
  ageMonths: number,
  kind: InfantNotificationAnalyticsKind,
): void {
  trackEvent("infant_notification_opened", childId, ageMonths, { kind });
}

export function trackInfantNotificationDismissed(
  childId: number,
  ageMonths: number,
  kind: InfantNotificationAnalyticsKind,
): void {
  trackEvent("infant_notification_dismissed", childId, ageMonths, { kind });
}

// ─── First-time parent activation ──────────────────────────────────────────────

export type InfantActivationStepId = "feed" | "sleep" | "weight" | "cry";

const ACTIVATION_STARTED_PREFIX = "amynest:infant-activation-analytics-started:";

function activationStartedOnce(childId: number): boolean {
  if (typeof window === "undefined") return true;
  const key = `${ACTIVATION_STARTED_PREFIX}${childId}`;
  if (localStorage.getItem(key) === "1") return false;
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* silent */
  }
  return true;
}

export function trackInfantActivationStarted(
  childId: number,
  ageMonths: number,
  props: { completionRate: number; childAgeDays: number },
): void {
  if (!activationStartedOnce(childId)) return;
  trackEvent("infant_activation_started", childId, ageMonths, {
    completionRate: props.completionRate,
    childAgeDays: props.childAgeDays,
  });
}

export function trackInfantActivationStepCompleted(
  childId: number,
  ageMonths: number,
  props: {
    stepId: InfantActivationStepId;
    completionRate: number;
    childAgeDays: number;
  },
): void {
  trackEvent("infant_activation_step_completed", childId, ageMonths, {
    stepId: props.stepId,
    completionRate: props.completionRate,
    childAgeDays: props.childAgeDays,
  });
}

export function trackInfantActivationCompleted(
  childId: number,
  ageMonths: number,
  props: { completionRate: number; completionTimeMs: number; childAgeDays: number },
): void {
  trackEvent("infant_activation_completed", childId, ageMonths, {
    completionRate: props.completionRate,
    completionTime: props.completionTimeMs,
    childAgeDays: props.childAgeDays,
  });
}
