import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";

/**
 * Per-user notification fatigue state — drives frequency reduction when
 * notifications are repeatedly ignored.
 */
export const notificationFatigueStateTable = pgTable("notification_fatigue_state", {
  userId: text("user_id").primaryKey(),
  consecutiveIgnores: integer("consecutive_ignores").notNull().default(0),
  rollingIgnores30d: integer("rolling_ignores_30d").notNull().default(0),
  /** 100 = full frequency, 80 = -20%, 60 = -40% */
  frequencyMultiplierPct: integer("frequency_multiplier_pct").notNull().default(100),
  highValueOnly: boolean("high_value_only").notNull().default(false),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationFatigueState = typeof notificationFatigueStateTable.$inferSelect;
export type InsertNotificationFatigueState = typeof notificationFatigueStateTable.$inferInsert;
