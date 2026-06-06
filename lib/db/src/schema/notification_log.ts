import { pgTable, text, serial, timestamp, index, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Permanent record of every notification we attempted to deliver.
 * Powers (a) the 4/day rate limit, (b) dedup of identical notifications
 * within a short window, (c) the in-app notification history view.
 *
 * status values:
 *   "pending"   → claim acquired; push not yet confirmed (claim-before-send)
 *   "sent"      → push provider accepted the message
 *   "throttled" → blocked by daily cap, quiet hours, or category disabled
 *   "failed"    → push rejected or all tokens failed
 *   "duplicate" → identical notification sent within dedup window (legacy rows)
 */
export const notificationLogTable = pgTable(
  "notification_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    deepLink: text("deep_link"),
    dedupKey: text("dedup_key"),
    status: text("status").notNull().default("sent"),
    platform: text("platform"),
    /** Expo ticket id or FCM message id when available. */
    providerMessageId: text("provider_message_id"),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    /** Adaptive engine metadata */
    contentHash: text("content_hash"),
    topicKey: text("topic_key"),
    recommendationKey: text("recommendation_key"),
    theme: text("theme"),
    contentType: text("content_type"),
    noveltyScore: integer("novelty_score"),
    relevanceScore: integer("relevance_score"),
    recencyScore: integer("recency_score"),
    engagementPredictionScore: integer("engagement_prediction_score"),
    qualityScore: integer("quality_score"),
    /** Outcome optimization engine metadata */
    goal: text("goal"),
    childLifecycleStage: text("child_lifecycle_stage"),
    parentMilestone: text("parent_milestone"),
    campaignId: text("campaign_id"),
    campaignStep: integer("campaign_step"),
    businessImpactScore: integer("business_impact_score"),
    routineCompletionProb: integer("routine_completion_prob"),
    learningCompletionProb: integer("learning_completion_prob"),
    retentionProb: integer("retention_prob"),
    subscriptionProb: integer("subscription_prob"),
    engagementProb: integer("engagement_prob"),
    experimentId: text("experiment_id"),
    experimentVariant: text("experiment_variant"),
    countryCode: text("country_code"),
    locale: text("locale"),
    timezoneAtSend: text("timezone_at_send"),
    culturalRegion: text("cultural_region"),
  },
  (t) => ({
    // Powers the "sent today" rate-limit query.
    userSentIdx: index("notification_log_user_sent_idx").on(t.userId, t.sentAt),
    userContentHashIdx: index("notification_log_user_content_hash_idx").on(t.userId, t.contentHash),
    userRecommendationIdx: index("notification_log_user_recommendation_idx").on(t.userId, t.recommendationKey),
    userTopicIdx: index("notification_log_user_topic_idx").on(t.userId, t.topicKey),
    // Atomic dedup at the DB level — partial unique on (user, dedup_key)
    // when dedup_key is set. Combined with onConflictDoNothing this gives us
    // race-free idempotency without explicit transactions.
    userDedupUnique: uniqueIndex("notification_log_user_dedup_unique")
      .on(t.userId, t.dedupKey)
      .where(sql`${t.dedupKey} IS NOT NULL`),
  }),
);

export type NotificationLog = typeof notificationLogTable.$inferSelect;
export type InsertNotificationLog = typeof notificationLogTable.$inferInsert;
