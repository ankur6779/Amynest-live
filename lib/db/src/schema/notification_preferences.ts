import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Per-user notification settings. One row per user. Each notification
 * category has its own boolean toggle so users can opt out of specific
 * types without disabling everything.
 *
 * Categories:
 * - routine: morning/afternoon/evening routine reminders
 * - nutrition: meal/snack suggestions, low-score food nudges
 * - insights: Amy AI tips, behavior observations
 * - weekly: Sunday weekly recap push notification
 * - engagement: re-engagement nudges when user has been inactive
 * - goodNight: bedtime/wind-down message
 *
 * Quiet hours: HH:MM 24h strings. If quietHoursStart > quietHoursEnd the
 * window is treated as overnight (e.g. 22:00 → 07:00).
 */
export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  routineEnabled: boolean("routine_enabled").notNull().default(true),
  nutritionEnabled: boolean("nutrition_enabled").notNull().default(true),
  insightsEnabled: boolean("insights_enabled").notNull().default(true),
  weeklyEnabled: boolean("weekly_enabled").notNull().default(true),
  engagementEnabled: boolean("engagement_enabled").notNull().default(true),
  goodNightEnabled: boolean("good_night_enabled").notNull().default(true),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  quietHoursStart: text("quiet_hours_start").notNull().default("22:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("07:00"),
  dailyCap: integer("daily_cap").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreferences = typeof notificationPreferencesTable.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferencesTable.$inferInsert;

export const NOTIFICATION_CATEGORIES = [
  "routine",
  "nutrition",
  "insights",
  "weekly",
  "engagement",
  "good_night",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
