import {
  SCHEDULED_NOTIFICATION_JOBS,
  getLocalDateTimeParts,
  jobDedupKey,
  shouldDeliverScheduledJob,
  culturalRegionFromCountry,
  resolveOutcomeStrategy,
  buildOutcomeContextForCategory,
  type ScheduledNotificationJob,
} from "@workspace/notification-engine";
import type { NotificationCategory } from "@workspace/db";
import { eq } from "drizzle-orm";
import { db, parentProfilesTable, pushTokensTable } from "@workspace/db";
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

  const rows: UserScheduleRow[] = [];
  for (const { userId } of tokenUsers) {
    const prefs = await getOrCreatePreferences(userId);
    const [profile] = await db
      .select({ country: parentProfilesTable.country })
      .from(parentProfilesTable)
      .where(eq(parentProfilesTable.userId, userId))
      .limit(1);
    rows.push({
      userId,
      prefs,
      countryCode: profile?.country ?? prefs.countryCode ?? null,
      childAgeYears: null,
    });
  }
  return rows;
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

  const users = await loadUserScheduleRows();

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

    for (const job of SCHEDULED_NOTIFICATION_JOBS) {
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
