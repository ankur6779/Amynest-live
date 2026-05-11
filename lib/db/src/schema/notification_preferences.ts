import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Per-user notification settings. One row per user. Each notification
 * category has its own boolean toggle so users can opt out of specific
 * types without disabling everything.
 *
 * Categories (12 total):
 * Core:
 * - routine:           morning/afternoon/evening routine reminders
 * - routine_item:      5-min heads-up per scheduled routine task
 * - nutrition:         meal/snack suggestions, low-score food nudges
 * - insights:          Amy AI tips, behavior observations (Ask AMY)
 * - weekly:            Sunday weekly recap push notification
 * - engagement:        re-engagement nudges / motivation / streak rewards
 * - good_night:        bedtime/wind-down message / sleep-health tips
 * New (Smart Engine):
 * - parenting_tips:    proactive daily parenting micro-tips
 * - story_time:        bedtime story reading reminder
 * - phonics:           phonics practice nudge (after-school slot)
 * - learning_activity: short learning activity suggestion
 * - milestone:         child developmental milestone alerts
 *
 * Intensity modes control the effective daily cap:
 *   minimal  → 3/day
 *   balanced → 6/day  (default)
 *   active   → 9/day
 *   growth   → 12/day  (Growth Mode 🚀)
 *
 * engagementScore (0–100): auto-updated by the dispatch service based on
 * open/ignore patterns. Higher score → system leans toward more categories.
 *
 * Quiet hours: HH:MM 24h strings. If quietHoursStart > quietHoursEnd the
 * window is treated as overnight (e.g. 22:00 → 07:00).
 */
export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),

  // ── Core categories (7) ──────────────────────────────────────────────────
  routineEnabled: boolean("routine_enabled").notNull().default(true),
  routineItemEnabled: boolean("routine_item_enabled").notNull().default(true),
  nutritionEnabled: boolean("nutrition_enabled").notNull().default(true),
  insightsEnabled: boolean("insights_enabled").notNull().default(true),
  weeklyEnabled: boolean("weekly_enabled").notNull().default(true),
  engagementEnabled: boolean("engagement_enabled").notNull().default(true),
  goodNightEnabled: boolean("good_night_enabled").notNull().default(true),

  // ── Smart engine categories (5 new) ──────────────────────────────────────
  parentingTipsEnabled: boolean("parenting_tips_enabled").notNull().default(true),
  storyTimeEnabled: boolean("story_time_enabled").notNull().default(true),
  phonicsEnabled: boolean("phonics_enabled").notNull().default(true),
  learningActivityEnabled: boolean("learning_activity_enabled").notNull().default(true),
  milestoneEnabled: boolean("milestone_enabled").notNull().default(true),

  // ── Scheduling ───────────────────────────────────────────────────────────
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  quietHoursStart: text("quiet_hours_start").notNull().default("22:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("07:00"),

  /**
   * Legacy manual cap. Kept for backward compat but superseded by
   * notificationIntensity. The dispatch service uses intensity-derived caps;
   * dailyCap is only honored when intensity is null (pre-migration rows).
   */
  dailyCap: integer("daily_cap").notNull().default(10),

  /**
   * Intensity mode — drives the smart daily cap:
   *   minimal  → 3/day
   *   balanced → 6/day
   *   active   → 9/day
   *   growth   → 12/day
   */
  notificationIntensity: text("notification_intensity").notNull().default("balanced"),

  /**
   * Rolling engagement score 0–100. Higher = user opens notifications
   * regularly. Used by cron to decide how many non-critical categories to
   * include in a given day (prevents spamming disengaged users).
   */
  engagementScore: integer("engagement_score").notNull().default(50),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreferences = typeof notificationPreferencesTable.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferencesTable.$inferInsert;

export const NOTIFICATION_CATEGORIES = [
  "routine",
  "routine_item",
  "nutrition",
  "insights",
  "weekly",
  "engagement",
  "good_night",
  "parenting_tips",
  "story_time",
  "phonics",
  "learning_activity",
  "milestone",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationIntensity = "minimal" | "balanced" | "active" | "growth";

/** Returns the effective daily cap for the given intensity mode. */
export function intensityToCap(intensity: string): number {
  switch (intensity) {
    case "minimal":  return 3;
    case "active":   return 9;
    case "growth":   return 12;
    case "balanced":
    default:         return 6;
  }
}
