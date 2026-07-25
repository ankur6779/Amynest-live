/**
 * Atomic claim-before-send for notification delivery.
 * Uses notification_log partial unique index (user_id, dedup_key) as the lock.
 */
import { eq, sql } from "drizzle-orm";
import { db, notificationLogTable, type NotificationCategory } from "@workspace/db";
import { logger } from "../lib/logger.js";

export type ClaimInput = {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink?: string;
  dedupKey?: string;
  contentMeta?: {
    contentHash?: string;
    topicKey?: string;
    recommendationKey?: string;
    theme?: string;
    contentType?: string;
    noveltyScore?: number;
    relevanceScore?: number;
    recencyScore?: number;
    engagementPredictionScore?: number;
    qualityScore?: number;
    businessImpactScore?: number;
    routineCompletionProb?: number;
    learningCompletionProb?: number;
    retentionProb?: number;
    subscriptionProb?: number;
    engagementProb?: number;
  };
  outcomeMeta?: {
    goal?: string;
    childLifecycleStage?: string;
    parentMilestone?: string | null;
    campaignId?: string | null;
    campaignStep?: number | null;
    experimentId?: string | null;
    experimentVariant?: string | null;
    segment?: string | null;
    journeyStepId?: string | null;
  };
  globalMeta?: {
    countryCode?: string | null;
    locale?: string | null;
    timezoneAtSend?: string | null;
    culturalRegion?: string | null;
  };
};

export const STALE_PENDING_CLAIM_MS = 15 * 60 * 1000;

export class NotificationDedupIndexMissingError extends Error {
  constructor() {
    super(
      "CRITICAL: notification_log_user_dedup_unique index is missing — " +
        "notification dedup is unsafe; run db:push and restart",
    );
    this.name = "NotificationDedupIndexMissingError";
  }
}

export async function notificationDedupIndexExists(): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'notification_log_user_dedup_unique'
    ) AS exists
  `);
  return result.rows[0]?.exists === true;
}

export async function assertNotificationDedupIndex(): Promise<void> {
  if (!(await notificationDedupIndexExists())) {
    throw new NotificationDedupIndexMissingError();
  }
}

type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Remove abandoned pending claims so delivery can be retried after worker crash. */
export async function clearStalePendingClaims(
  userId: string,
  fingerprint: string,
  exec: DbExec = db,
): Promise<void> {
  await exec.execute(sql`
    DELETE FROM notification_log
    WHERE user_id = ${userId}
      AND dedup_key = ${fingerprint}
      AND status = 'pending'
      AND sent_at < NOW() - INTERVAL '15 minutes'
  `);
}

/**
 * Attempt exclusive ownership of a notification fingerprint.
 * Returns claim row id when this worker won the race; null if already claimed.
 */
export async function claimNotificationDelivery(
  input: ClaimInput,
): Promise<number | null> {
  if (!input.dedupKey) return null;

  await clearStalePendingClaims(input.userId, input.dedupKey);

  const meta = input.contentMeta;
  const global = input.globalMeta;
  const outcome = input.outcomeMeta;

  const result = await db.execute<{ id: number }>(sql`
    INSERT INTO notification_log (
      user_id,
      category,
      title,
      body,
      deep_link,
      dedup_key,
      status,
      content_hash,
      topic_key,
      recommendation_key,
      theme,
      content_type,
      novelty_score,
      relevance_score,
      recency_score,
      engagement_prediction_score,
      quality_score,
      business_impact_score,
      routine_completion_prob,
      learning_completion_prob,
      retention_prob,
      subscription_prob,
      engagement_prob,
      goal,
      child_lifecycle_stage,
      parent_milestone,
      campaign_id,
      campaign_step,
      experiment_id,
      experiment_variant,
      country_code,
      locale,
      timezone_at_send,
      cultural_region,
      sent_at
    ) VALUES (
      ${input.userId},
      ${input.category},
      ${input.title},
      ${input.body},
      ${input.deepLink ?? null},
      ${input.dedupKey},
      'pending',
      ${meta?.contentHash ?? null},
      ${meta?.topicKey ?? null},
      ${meta?.recommendationKey ?? null},
      ${meta?.theme ?? null},
      ${meta?.contentType ?? null},
      ${meta?.noveltyScore ?? null},
      ${meta?.relevanceScore ?? null},
      ${meta?.recencyScore ?? null},
      ${meta?.engagementPredictionScore ?? null},
      ${meta?.businessImpactScore ?? meta?.qualityScore ?? null},
      ${meta?.businessImpactScore ?? meta?.qualityScore ?? null},
      ${meta?.routineCompletionProb ?? null},
      ${meta?.learningCompletionProb ?? null},
      ${meta?.retentionProb ?? null},
      ${meta?.subscriptionProb ?? null},
      ${meta?.engagementProb ?? null},
      ${outcome?.goal ?? null},
      ${outcome?.childLifecycleStage ?? null},
      ${outcome?.parentMilestone ?? null},
      ${outcome?.campaignId ?? null},
      ${outcome?.campaignStep ?? null},
      ${outcome?.experimentId ?? null},
      ${outcome?.experimentVariant ?? null},
      ${global?.countryCode ?? null},
      ${global?.locale ?? null},
      ${global?.timezoneAtSend ?? null},
      ${global?.culturalRegion ?? null},
      NOW()
    )
    ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL
    DO NOTHING
    RETURNING id
  `);

  const id = result.rows[0]?.id ?? null;
  if (id == null) {
    logger.info(
      {
        evt: "NOTIFICATION_SKIPPED_DUPLICATE",
        userId: input.userId,
        fingerprint: input.dedupKey,
        notificationType: input.category,
        reason: "claim_conflict",
      },
      "Notification claim lost — another worker owns this fingerprint",
    );
  }
  return id;
}

export async function finalizeNotificationClaim(
  claimId: number,
  update: {
    status: "sent" | "failed";
    platform?: string;
    errorMessage?: string;
    providerMessageId?: string;
  },
): Promise<void> {
  await db
    .update(notificationLogTable)
    .set({
      status: update.status,
      platform: update.platform ?? null,
      errorMessage: update.errorMessage ?? null,
      providerMessageId: update.providerMessageId ?? null,
      sentAt: new Date(),
    })
    .where(eq(notificationLogTable.id, claimId));
}

/** Throttled / no-token events must not occupy dedup keys. */
export async function logNonDeliveryEvent(
  input: ClaimInput,
  status: string,
  errorMessage?: string,
): Promise<void> {
  const meta = input.contentMeta;
  const global = input.globalMeta;
  const outcome = input.outcomeMeta;
  await db.insert(notificationLogTable).values({
    userId: input.userId,
    category: input.category,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink ?? null,
    dedupKey: null,
    status,
    errorMessage: errorMessage ?? null,
    contentHash: meta?.contentHash ?? null,
    topicKey: meta?.topicKey ?? null,
    recommendationKey: meta?.recommendationKey ?? null,
    theme: meta?.theme ?? null,
    contentType: meta?.contentType ?? null,
    noveltyScore: meta?.noveltyScore ?? null,
    relevanceScore: meta?.relevanceScore ?? null,
    recencyScore: meta?.recencyScore ?? null,
    engagementPredictionScore: meta?.engagementPredictionScore ?? null,
    qualityScore: meta?.businessImpactScore ?? meta?.qualityScore ?? null,
    businessImpactScore: meta?.businessImpactScore ?? meta?.qualityScore ?? null,
    routineCompletionProb: meta?.routineCompletionProb ?? null,
    learningCompletionProb: meta?.learningCompletionProb ?? null,
    retentionProb: meta?.retentionProb ?? null,
    subscriptionProb: meta?.subscriptionProb ?? null,
    engagementProb: meta?.engagementProb ?? null,
    goal: outcome?.goal ?? null,
    childLifecycleStage: outcome?.childLifecycleStage ?? null,
    parentMilestone: outcome?.parentMilestone ?? null,
    campaignId: outcome?.campaignId ?? null,
    campaignStep: outcome?.campaignStep ?? null,
    experimentId: outcome?.experimentId ?? null,
    experimentVariant: outcome?.experimentVariant ?? null,
    segment: outcome?.segment ?? null,
    journeyStepId: outcome?.journeyStepId ?? null,
    countryCode: global?.countryCode ?? null,
    locale: global?.locale ?? null,
    timezoneAtSend: global?.timezoneAtSend ?? null,
    culturalRegion: global?.culturalRegion ?? null,
  });
}
