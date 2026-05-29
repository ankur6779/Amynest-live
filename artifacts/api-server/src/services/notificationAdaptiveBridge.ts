import {
  ADAPTIVE_CATEGORIES,
  buildAdaptiveNotification,
  buildOutcomeContextForCategory,
  type AdaptiveBuildResult,
} from "@workspace/notification-engine";
import type { NotificationCategory } from "@workspace/db";
import { eq } from "drizzle-orm";
import { db, notificationPreferencesTable, parentProfilesTable } from "@workspace/db";
import type { BuiltNotification } from "./notificationContentBuilder.js";
import { loadUserContentHistory } from "./notificationContentHistoryService.js";
import { loadOutcomeSignals } from "./notificationOutcomeService.js";

interface ChildSummary {
  id: number;
  name: string;
  age: number;
  ageMonths: number;
  foodType: string;
}

async function loadGlobalProfile(userId: string) {
  const [profile] = await db
    .select({
      country: parentProfilesTable.country,
      allergies: parentProfilesTable.allergies,
    })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);

  const [prefs] = await db
    .select({ locale: notificationPreferencesTable.locale, countryCode: notificationPreferencesTable.countryCode })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);

  return {
    countryCode: profile?.country ?? prefs?.countryCode ?? null,
    locale: prefs?.locale ?? null,
    allergies: profile?.allergies
      ? profile.allergies.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

export async function buildAdaptiveCategoryNotification(
  userId: string,
  timezone: string,
  category: NotificationCategory,
  child: ChildSummary,
): Promise<BuiltNotification | null> {
  if (!ADAPTIVE_CATEGORIES.has(category)) return null;

  const global = await loadGlobalProfile(userId);
  const history = await loadUserContentHistory(userId, timezone);
  const outcomeSignals = await loadOutcomeSignals(userId, timezone);
  const result = buildAdaptiveNotification({
    userId,
    category,
    timezone,
    locale: global.locale,
    countryCode: global.countryCode,
    allergies: global.allergies,
    child,
    history,
    outcomeSignals: outcomeSignals ?? undefined,
  });

  if (!result) return null;

  return toBuiltNotification(result, userId, category, outcomeSignals);
}

function toBuiltNotification(
  result: AdaptiveBuildResult,
  userId: string,
  category: NotificationCategory,
  outcomeSignals?: Awaited<ReturnType<typeof loadOutcomeSignals>>,
): BuiltNotification {
  const impact = result.businessImpact;
  const outcomeCtx =
    outcomeSignals != null
      ? buildOutcomeContextForCategory(userId, category, outcomeSignals)
      : null;

  return {
    title: result.notification.title,
    body: result.notification.body,
    deepLink: result.notification.deepLink,
    dedupKey: result.notification.dedupKey,
    data: result.notification.data,
    contentMeta: {
      contentHash: result.notification.contentHash,
      topicKey: result.notification.topicKey,
      recommendationKey: result.notification.recommendationKey,
      theme: result.notification.theme,
      contentType: result.notification.contentType,
      noveltyScore: result.scores.novelty,
      relevanceScore: result.scores.relevance,
      recencyScore: result.scores.recency,
      engagementPredictionScore: result.scores.engagementPrediction,
      qualityScore: impact?.composite ?? result.scores.composite,
      businessImpactScore: impact?.composite ?? result.scores.composite,
      routineCompletionProb: impact?.routineCompletionProb,
      learningCompletionProb: impact?.learningCompletionProb,
      retentionProb: impact?.retentionProb,
      subscriptionProb: impact?.subscriptionProb,
      engagementProb: impact?.engagementProb,
    },
    outcomeMeta: outcomeCtx
      ? {
          goal: outcomeCtx.goal,
          childLifecycleStage: outcomeCtx.childLifecycleStage,
          parentMilestone: outcomeCtx.parentMilestone,
          campaignId: outcomeCtx.campaignId,
          campaignStep: outcomeCtx.campaignStep,
          experimentId: outcomeCtx.experimentId,
          experimentVariant: outcomeCtx.experimentVariant,
        }
      : undefined,
  };
}

export type { AdaptiveBuildResult };
