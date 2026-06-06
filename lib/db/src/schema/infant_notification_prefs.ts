import { pgTable, text, serial, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export type InfantNotificationKind =
  | "nap_window"
  | "feed_reminder"
  | "vaccine_due"
  | "milestone_tip"
  | "sleep_drift"
  | "sleep_weekly_report";

export type InfantSnoozeMap = Partial<Record<InfantNotificationKind, string>>;

/**
 * Per-user, per-child infant smart notification preferences.
 * Synced from Infant Hub UI; scheduler reads these server-side.
 */
export const infantNotificationPrefsTable = pgTable(
  "infant_notification_prefs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    napReminders: boolean("nap_reminders").notNull().default(true),
    feedReminders: boolean("feed_reminders").notNull().default(true),
    vaccineReminders: boolean("vaccine_reminders").notNull().default(true),
    milestoneTips: boolean("milestone_tips").notNull().default(true),
    sleepDrift: boolean("sleep_drift").notNull().default(false),
    /** Premium weekly AI sleep coaching report push (future cron). */
    weeklySleepReport: boolean("weekly_sleep_report").notNull().default(false),
    /** Max infant_care pushes per local day for this user (anti-spam). */
    maxPerDay: integer("max_per_day").notNull().default(2),
    snoozeUntil: jsonb("snooze_until").$type<InfantSnoozeMap>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userChildUniq: uniqueIndex("infant_notification_prefs_user_child_uniq").on(
      t.userId,
      t.childId,
    ),
  }),
);

export type InfantNotificationPrefsRow = typeof infantNotificationPrefsTable.$inferSelect;
export type InsertInfantNotificationPrefsRow =
  typeof infantNotificationPrefsTable.$inferInsert;
