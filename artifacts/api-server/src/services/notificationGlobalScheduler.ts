import {
  SCHEDULED_NOTIFICATION_JOBS,
  getLocalDateTimeParts,
  jobDedupKey,
  shouldDeliverScheduledJob,
  culturalRegionFromCountry,
  resolveOutcomeStrategy,
  buildOutcomeContextForCategory,
  detectLifecycleStage,
  assessFatigue,
  decideNotification,
  evaluateQuality,
  evaluateSuppression,
  inferParentPersona,
  computeParentValueScore,
  type ScheduledNotificationJob,
  type OutcomeSignals,
} from "@workspace/notification-engine";
import type { NotificationCategory } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { db, notificationPreferencesTable, parentProfilesTable, pushTokensTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { dispatchNotification, getOrCreatePreferences } from "./notificationDispatchService.js";
import {
  buildMorningRoutine,
  buildSnackTime,
  buildDinnerSuggestion,
  buildGoodNight,
  buildWeeklyReport,
  buildEngagement,
  buildAmyInsight,
  buildParentingTip,
  buildStoryTime,
  buildPhonicsReminder,
  buildLearningActivity,
  buildMilestoneAlert,
  type BuiltNotification,
} from "./notificationContentBuilder.js";
import { loadOutcomeSignals, loadCampaignProgress } from "./notificationOutcomeService.js";
import { runSegmentJourneyForUser } from "./notificationSegmentService.js";
import { refreshFamilyIntelligence } from "./unifiedFamilyIntelligenceService.js";
import { getTopPriorityForNotifications } from "@workspace/family-intelligence";

type BuilderFn = (userId: string, timezone: string) => Promise<BuiltNotification | null>;

const JOB_BUILDERS: Record<string, BuilderFn> = {
  morning_routine: buildMorningRoutine,
  parenting_tip: buildParentingTip,
  learning_activity: buildLearningActivity,
  milestone_alert: buildMilestoneAlert,
  amy_insight: buildAmyInsight,
  snack_time: buildSnackTime,
  phonics_reminder: buildPhonicsReminder,
  dinner_suggestion: buildDinnerSuggestion,
  engagement_sweep: buildEngagement,
  story_time: buildStoryTime,
  good_night: buildGoodNight,
  weekly_report: buildWeeklyReport,
};

type DecisionMode = "off" | "shadow" | "enforce";

/**
 * Expected-value decision engine mode (feature flag):
 *   off      → no behavior change (default; safest)
 *   shadow   → evaluate + log decisions, but always dispatch (observability)
 *   enforce  → suppress negative-expected-value / fatigued sends
 */
function decisionEngineMode(): DecisionMode {
  const raw = (process.env.NOTIF_DECISION_ENGINE ?? "off").toLowerCase();
  if (raw === "shadow" || raw === "enforce") return raw;
  return "off";
}

interface IntelligenceGateResult {
  proceed: boolean;
  send: boolean;
  expectedValue: number;
  reason: string;
  factors: string[];
  fatigueLevel: string;
  lifecycleStage: string;
  persona: string;
  valueScore: number;
  qualityScore: number;
  qualityPassed: boolean;
  suppressionReason: string | null;
  suppressionReasons: string[];
}

/**
 * Full notification-intelligence gate for a candidate send. Composes the
 * expected-value decision engine, copy-level quality AI, and the unified
 * suppression engine, and derives persona + parent-value for analytics.
 *
 * Pure computation on already-loaded signals + the built copy — no extra DB
 * round-trips. The caller decides whether to enforce based on the flag mode.
 */
function evaluateIntelligenceGate(
  signals: OutcomeSignals,
  opts: {
    goal: string;
    priority: number;
    critical: boolean;
    category: NotificationCategory;
    title: string;
    body: string;
  },
): IntelligenceGateResult {
  const eng = signals.engagement;
  const sent7d = eng?.notificationsSent7d ?? 0;
  const opened7d = signals.notificationsOpened7d ?? 0;
  const fatigue = assessFatigue({
    sent7d,
    opened7d,
    dismissed7d: eng?.notificationsDismissed7d ?? 0,
    consecutiveIgnored: eng?.consecutiveIgnored ?? 0,
    permissionGranted: eng?.permissionGranted ?? true,
  });
  const lifecycleStage = detectLifecycleStage(signals);
  const monetization = opts.goal === "GOAL_SUBSCRIPTION";

  const decision = decideNotification(
    { goal: opts.goal, priority: opts.priority, monetization, critical: opts.critical },
    {
      lifecycleStage,
      fatigue,
      isPremium: signals.isPremium,
      highPurchaseIntent: lifecycleStage === "HIGH_PURCHASE_INTENT",
      openRate7d: sent7d > 0 ? opened7d / sent7d : undefined,
    },
  );

  const quality = evaluateQuality({
    title: opts.title,
    body: opts.body,
    goal: opts.goal,
    monetization,
  });

  // Critical, time-sensitive messages bypass the soft quality/diversity gates
  // (a slightly imperfect bedtime reminder still beats silence), but never the
  // hard decision blocks.
  const verdict = evaluateSuppression({
    decision,
    quality: opts.critical ? null : quality,
  });

  const persona = inferParentPersona(signals);
  const value = computeParentValueScore(signals);

  return {
    proceed: !verdict.suppress,
    send: decision.send,
    expectedValue: decision.expectedValue,
    reason: decision.reason,
    factors: decision.factors,
    fatigueLevel: fatigue.level,
    lifecycleStage,
    persona: persona.primary,
    valueScore: value.score,
    qualityScore: quality.score,
    qualityPassed: quality.passed,
    suppressionReason: verdict.reason,
    suppressionReasons: verdict.reasons,
  };
}

function categoryEnabled(
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
  category: NotificationCategory,
): boolean {
  switch (category) {
    case "routine": return prefs.routineEnabled;
    case "routine_item": return prefs.routineItemEnabled;
    case "nutrition": return prefs.nutritionEnabled;
    case "insights": return prefs.insightsEnabled;
    case "weekly": return prefs.weeklyEnabled;
    case "engagement": return prefs.engagementEnabled;
    case "good_night": return prefs.goodNightEnabled;
    case "parenting_tips": return prefs.parentingTipsEnabled;
    case "story_time": return prefs.storyTimeEnabled;
    case "phonics": return prefs.phonicsEnabled;
    case "learning_activity": return prefs.learningActivityEnabled;
    case "milestone": return prefs.milestoneEnabled;
    case "infant_care": return prefs.infantCareEnabled;
    default: return true;
  }
}

interface UserScheduleRow {
  userId: string;
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>;
  countryCode: string | null;
  childAgeYears: number | null;
}

async function loadUserScheduleRows(): Promise<UserScheduleRow[]> {
  const tokenUsers = await db
    .selectDistinct({ userId: pushTokensTable.userId })
    .from(pushTokensTable);

  const userIds = tokenUsers.map((row) => row.userId);
  if (userIds.length === 0) return [];

  const [prefsRows, profileRows] = await Promise.all([
    db
      .select()
      .from(notificationPreferencesTable)
      .where(inArray(notificationPreferencesTable.userId, userIds)),
    db
      .select({ userId: parentProfilesTable.userId, country: parentProfilesTable.country })
      .from(parentProfilesTable)
      .where(inArray(parentProfilesTable.userId, userIds)),
  ]);

  const prefsMap = new Map(prefsRows.map((row) => [row.userId, row]));
  const profileMap = new Map(profileRows.map((row) => [row.userId, row.country]));

  const missingUserIds = userIds.filter((userId) => !prefsMap.has(userId));
  if (missingUserIds.length > 0) {
    await db
      .insert(notificationPreferencesTable)
      .values(missingUserIds.map((userId) => ({ userId })))
      .onConflictDoNothing({ target: notificationPreferencesTable.userId });
    const createdPrefs = await db
      .select()
      .from(notificationPreferencesTable)
      .where(inArray(notificationPreferencesTable.userId, missingUserIds));
    for (const prefs of createdPrefs) {
      prefsMap.set(prefs.userId, prefs);
    }
    for (const userId of missingUserIds) {
      if (!prefsMap.has(userId)) {
        prefsMap.set(userId, await getOrCreatePreferences(userId));
      }
    }
  }

  return userIds.map((userId) => {
    const prefs = prefsMap.get(userId)!;
    return {
      userId,
      prefs,
      countryCode: profileMap.get(userId) ?? prefs.countryCode ?? null,
      childAgeYears: null,
    };
  });
}

export async function runGlobalScheduleTick(now = new Date()): Promise<{
  attempted: number;
  sent: number;
  throttled: number;
  failed: number;
}> {
  let attempted = 0;
  let sent = 0;
  let throttled = 0;
  let failed = 0;

  const decisionMode = decisionEngineMode();
  const users = await loadUserScheduleRows();
  const signalsCache = new Map<string, Awaited<ReturnType<typeof loadOutcomeSignals>>>();
  const campaignCache = new Map<string, Awaited<ReturnType<typeof loadCampaignProgress>>>();
  const familyIntelCache = new Map<string, Awaited<ReturnType<typeof refreshFamilyIntelligence>>>();

  for (const user of users) {
    const tz = user.prefs.timezone;
    const local = getLocalDateTimeParts(tz, now);
    const region = culturalRegionFromCountry(user.countryCode);

    if (!signalsCache.has(user.userId)) {
      signalsCache.set(user.userId, await loadOutcomeSignals(user.userId, tz));
      campaignCache.set(user.userId, await loadCampaignProgress(user.userId));
      try {
        familyIntelCache.set(user.userId, await refreshFamilyIntelligence(user.userId, tz));
      } catch {
        /* family intelligence is best-effort during tick */
      }
    }
    const signals = signalsCache.get(user.userId);
    const campaignProgress = campaignCache.get(user.userId);
    const familyIntel = familyIntelCache.get(user.userId);
    const notifPriority = familyIntel ? getTopPriorityForNotifications(familyIntel) : null;

    // ── CRM segment journey (feature-flagged; runs before scheduled jobs) ──
    if (signals) {
      try {
        const crmResult = await runSegmentJourneyForUser(
          user.userId,
          user.prefs,
          signals,
          user.countryCode,
          now,
        );
        if (crmResult === "sent") sent++;
        else if (crmResult === "skipped" || crmResult === "delayed") throttled++;
      } catch (err) {
        logger.warn({ err, userId: user.userId }, "CRM segment journey tick failed");
      }
    }

    for (const job of SCHEDULED_NOTIFICATION_JOBS) {
      if (
        job.jobId === "engagement_sweep" &&
        (process.env["NOTIF_REENGAGEMENT_MODE"] ?? "").trim().toLowerCase() === "live"
      ) {
        continue;
      }

      const gate = shouldDeliverScheduledJob(job, local, {
        userId: user.userId,
        timezone: tz,
        quietHoursStart: user.prefs.quietHoursStart,
        quietHoursEnd: user.prefs.quietHoursEnd,
        preferredEngagementHour: user.prefs.preferredEngagementHour,
        smartDeliveryEnabled: user.prefs.smartDeliveryEnabled,
        consent: {
          pushConsentAt: user.prefs.pushConsentAt,
          pushConsentVersion: user.prefs.pushConsentVersion,
          marketingOptIn: user.prefs.marketingOptIn,
          countryCode: user.countryCode,
          childAgeYears: user.childAgeYears,
        },
        categoryEnabled: (cat) => categoryEnabled(user.prefs, cat),
      }, now);

      if (!gate.deliver) continue;

      if (
        notifPriority?.suppressLowPriority &&
        !["routine", "routine_item", "milestone", "insights"].includes(job.category)
      ) {
        continue;
      }

      attempted++;
      const builder = JOB_BUILDERS[job.jobId];
      if (!builder) continue;

      try {
        let built: BuiltNotification | null = null;

        if (signals) {
          const outcomeDraft = resolveOutcomeStrategy({
            userId: user.userId,
            category: job.category,
            localDate: local.localDate,
            timezone: tz,
            signals,
            campaignProgress,
          });
          if (outcomeDraft && outcomeDraft.priority >= 65) {
            built = {
              title: outcomeDraft.title,
              body: outcomeDraft.body,
              deepLink: outcomeDraft.deepLink,
              dedupKey: outcomeDraft.dedupKey,
              data: {
                goal: outcomeDraft.goal,
                recommendationKey: outcomeDraft.recommendationKey,
                engine: "outcome-v3",
              },
              contentMeta: {
                recommendationKey: outcomeDraft.recommendationKey,
                qualityScore: outcomeDraft.priority,
                businessImpactScore: outcomeDraft.priority,
              },
              outcomeMeta: {
                goal: outcomeDraft.outcome.goal,
                childLifecycleStage: outcomeDraft.outcome.childLifecycleStage,
                parentMilestone: outcomeDraft.outcome.parentMilestone,
                campaignId: outcomeDraft.outcome.campaignId,
                campaignStep: outcomeDraft.outcome.campaignStep,
                experimentId: outcomeDraft.outcome.experimentId,
                experimentVariant: outcomeDraft.outcome.experimentVariant,
              },
            };
          }
        }

        if (!built) {
          const builder = JOB_BUILDERS[job.jobId];
          if (!builder) continue;
          built = await builder(user.userId, tz);
        }

        if (!built) {
          throttled++;
          continue;
        }

        if (!built.outcomeMeta && signals) {
          const ctx = buildOutcomeContextForCategory(user.userId, job.category, signals);
          built.outcomeMeta = {
            goal: ctx.goal,
            childLifecycleStage: ctx.childLifecycleStage,
            parentMilestone: ctx.parentMilestone,
            campaignId: ctx.campaignId,
            campaignStep: ctx.campaignStep,
            experimentId: ctx.experimentId,
            experimentVariant: ctx.experimentVariant,
          };
        }

        // ── Notification intelligence gate (feature-flagged) ────────────────
        if (decisionMode !== "off" && signals) {
          const gate = evaluateIntelligenceGate(signals, {
            goal: built.outcomeMeta?.goal ?? "GOAL_PARENT_ENGAGEMENT",
            priority: built.contentMeta?.businessImpactScore ?? 50,
            critical: Boolean(job.slot.critical),
            category: job.category,
            title: built.title,
            body: built.body,
          });

          // Attach intelligence metadata for downstream analytics (migration-free).
          built.data = {
            ...built.data,
            lifecycleStage: gate.lifecycleStage,
            persona: gate.persona,
            parentValueScore: gate.valueScore,
            qualityScore: gate.qualityScore,
            decisionExpectedValue: gate.expectedValue,
          };

          if (!gate.proceed) {
            logger.info(
              {
                evt: "NOTIFICATION_INTELLIGENCE_GATE",
                mode: decisionMode,
                userId: user.userId,
                job: job.jobId,
                category: job.category,
                expectedValue: gate.expectedValue,
                reason: gate.reason,
                suppressionReason: gate.suppressionReason,
                suppressionReasons: gate.suppressionReasons,
                fatigueLevel: gate.fatigueLevel,
                lifecycleStage: gate.lifecycleStage,
                persona: gate.persona,
                valueScore: gate.valueScore,
                qualityScore: gate.qualityScore,
                qualityPassed: gate.qualityPassed,
                factors: gate.factors,
                enforced: decisionMode === "enforce",
              },
              "Notification intelligence gate suppressed candidate",
            );
            if (decisionMode === "enforce") {
              throttled++;
              continue;
            }
          }
        }

        const dedupKey = built.dedupKey ?? jobDedupKey(job.jobId, local.localDate);
        const result = await dispatchNotification({
          userId: user.userId,
          category: job.category,
          title: built.title,
          body: built.body,
          deepLink: built.deepLink,
          dedupKey,
          data: built.data,
          contentMeta: built.contentMeta,
          outcomeMeta: built.outcomeMeta,
          globalMeta: {
            countryCode: user.countryCode,
            locale: user.prefs.locale,
            timezoneAtSend: tz,
            culturalRegion: region,
          },
        });

        if (result.status === "sent") sent++;
        else if (result.status === "failed") failed++;
        else throttled++;
      } catch (err) {
        failed++;
        logger.error({ err, userId: user.userId, job: job.jobId }, "Global schedule dispatch error");
      }
    }
  }

  return { attempted, sent, throttled, failed };
}

export { SCHEDULED_NOTIFICATION_JOBS, type ScheduledNotificationJob };
