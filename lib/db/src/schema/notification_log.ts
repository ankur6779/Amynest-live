import { pgTable, text, serial, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Permanent record of every notification we attempted to deliver.
 * Powers (a) the 4/day rate limit, (b) dedup of identical notifications
 * within a short window, (c) the in-app notification history view.
 *
 * status values:
 *   "sent"      → Expo accepted the message
 *   "throttled" → blocked by daily cap, quiet hours, or category disabled
 *   "failed"    → Expo rejected (invalid token, etc.)
 *   "duplicate" → identical notification sent within dedup window
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
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
  },
  (t) => ({
    // Powers the "sent today" rate-limit query.
    userSentIdx: index("notification_log_user_sent_idx").on(t.userId, t.sentAt),
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
