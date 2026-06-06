/**
 * Atomic notification slot acquisition — serializes per-user dispatch so rate
 * limits remain correct under concurrent workers (advisory xact lock + recount).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db, notificationLogTable } from "@workspace/db";
import {
  evaluateDeliveryGuard,
  parseFingerprintChildId,
  type DeliveryHistoryRow,
} from "@workspace/notification-engine";
import {
  clearStalePendingClaims,
  type ClaimInput,
} from "./notificationClaimService.js";
import { recordNotificationMetric } from "./notification-metrics-store.js";
import { logger } from "../lib/logger.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AtomicSlotResult =
  | { ok: true; claimId: number }
  | {
      ok: false;
      status: "duplicate" | "rate_limited" | "cooldown_blocked" | "throttled";
      reason: string;
      logEvent?: string;
    };

async function countActiveToday(
  tx: Tx,
  userId: string,
  timezone: string,
): Promise<number> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDate = fmt.format(new Date());
  const result = await tx.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND status IN ('sent', 'pending')
      AND (sent_at AT TIME ZONE ${timezone})::date = ${localDate}::date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function countActiveTodayForChild(
  tx: Tx,
  userId: string,
  childId: string,
  timezone: string,
): Promise<number> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDate = fmt.format(new Date());
  const prefix = `${childId}_%`;
  const result = await tx.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND status IN ('sent', 'pending')
      AND dedup_key LIKE ${prefix}
      AND (sent_at AT TIME ZONE ${timezone})::date = ${localDate}::date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function countActiveLastHour(tx: Tx, userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const result = await tx.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND status IN ('sent', 'pending')
      AND sent_at >= ${cutoff}
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function loadDeliveryHistoryTx(
  tx: Tx,
  userId: string,
  fingerprint: string,
): Promise<DeliveryHistoryRow[]> {
  const rows = await tx
    .select({
      dedupKey: notificationLogTable.dedupKey,
      status: notificationLogTable.status,
      sentAt: notificationLogTable.sentAt,
    })
    .from(notificationLogTable)
    .where(
      and(
        eq(notificationLogTable.userId, userId),
        eq(notificationLogTable.dedupKey, fingerprint),
      ),
    )
    .orderBy(desc(notificationLogTable.sentAt))
    .limit(20);
  return rows
    .filter((r): r is typeof r & { dedupKey: string } => r.dedupKey != null)
    .map((r) => ({ dedupKey: r.dedupKey, status: r.status, sentAt: r.sentAt }));
}

function guardStatusFromReason(
  reason: string,
): "duplicate" | "rate_limited" | "cooldown_blocked" {
  if (reason === "cooldown") return "cooldown_blocked";
  if (reason.startsWith("rate_limit_")) return "rate_limited";
  return "duplicate";
}

async function insertOutcomeLogTx(
  tx: Tx,
  input: ClaimInput,
  status: string,
  errorMessage?: string,
): Promise<void> {
  const meta = input.contentMeta;
  const global = input.globalMeta;
  const outcome = input.outcomeMeta;
  await tx.insert(notificationLogTable).values({
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
    countryCode: global?.countryCode ?? null,
    locale: global?.locale ?? null,
    timezoneAtSend: global?.timezoneAtSend ?? null,
    culturalRegion: global?.culturalRegion ?? null,
  });
}

async function insertClaimTx(tx: Tx, input: ClaimInput): Promise<number | null> {
  const meta = input.contentMeta;
  const global = input.globalMeta;
  const outcome = input.outcomeMeta;

  const result = await tx.execute<{ id: number }>(sql`
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
  return result.rows[0]?.id ?? null;
}

export type AtomicAcquireInput = ClaimInput & {
  timezone: string;
  /** User intensity daily cap — checked atomically with guard limits. */
  intensityDailyCap?: number;
  /** When true, skip intensity cap (routine_item, test sends). */
  skipIntensityCap?: boolean;
};

/**
 * Acquire an exclusive delivery slot under per-user advisory xact lock.
 * Guard evaluation, intensity cap, and claim insert happen in one transaction.
 */
export async function atomicAcquireDeliverySlot(
  input: AtomicAcquireInput,
): Promise<AtomicSlotResult> {
  const fingerprint = input.dedupKey;
  if (!fingerprint) {
    return { ok: false, status: "duplicate", reason: "missing_fingerprint" };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtext(${`notif_dispatch:${input.userId}`}))
    `);

    await clearStalePendingClaims(input.userId, fingerprint, tx);
    const childId = parseFingerprintChildId(fingerprint);
    const [history, accountSentToday, accountSentLastHour, childSentToday] = await Promise.all([
      loadDeliveryHistoryTx(tx, input.userId, fingerprint),
      countActiveToday(tx, input.userId, input.timezone),
      countActiveLastHour(tx, input.userId),
      childId != null
        ? countActiveTodayForChild(tx, input.userId, childId, input.timezone)
        : Promise.resolve(0),
    ]);

    const decision = evaluateDeliveryGuard({
      fingerprint,
      timezone: input.timezone,
      history,
      childSentToday,
      accountSentToday,
      accountSentLastHour,
    });

    if (!decision.allow) {
      const status = guardStatusFromReason(decision.reason);
      await insertOutcomeLogTx(tx, input, status, decision.reason);
      if (status === "rate_limited") {
        recordNotificationMetric("notification_rate_limited_total");
      } else {
        recordNotificationMetric("notification_duplicate_blocked_total");
      }
      logger.info(
        {
          evt: decision.logEvent,
          userId: input.userId,
          fingerprint,
          reason: decision.reason,
        },
        "Notification blocked by atomic guard",
      );
      return {
        ok: false,
        status,
        reason: decision.reason,
        logEvent: decision.logEvent,
      };
    }

    if (
      !input.skipIntensityCap &&
      input.intensityDailyCap != null &&
      accountSentToday >= input.intensityDailyCap
    ) {
      await insertOutcomeLogTx(
        tx,
        input,
        "throttled",
        `daily_cap:${input.intensityDailyCap}`,
      );
      return { ok: false, status: "throttled", reason: "daily_cap" };
    }

    const claimId = await insertClaimTx(tx, input);
    if (claimId == null) {
      await insertOutcomeLogTx(tx, input, "duplicate", "claim_conflict");
      recordNotificationMetric("notification_claim_conflicts_total");
      logger.info(
        {
          evt: "NOTIFICATION_SKIPPED_DUPLICATE",
          userId: input.userId,
          fingerprint,
          reason: "claim_conflict",
        },
        "Notification claim lost inside atomic transaction",
      );
      return { ok: false, status: "duplicate", reason: "claim_conflict" };
    }

    recordNotificationMetric("notification_pending_total");
    return { ok: true, claimId };
  });
}

export async function countPendingClaims(): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log WHERE status = 'pending'
  `);
  return Number(result.rows[0]?.count ?? 0);
}

/** Global sweep for abandoned pending claims (worker crash recovery). */
export async function releaseStalePendingClaimsGlobally(
  staleMinutes = 15,
): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`
    WITH deleted AS (
      DELETE FROM notification_log
      WHERE status = 'pending'
        AND sent_at < NOW() - (${staleMinutes}::int * INTERVAL '1 minute')
      RETURNING id
    )
    SELECT COUNT(*)::int AS count FROM deleted
  `);
  const count = Number(result.rows[0]?.count ?? 0);
  if (count > 0) {
    logger.warn(
      { evt: "NOTIFICATION_STALE_PENDING_RELEASED", count, staleMinutes },
      "Released stale pending notification claims",
    );
  }
  return count;
}
