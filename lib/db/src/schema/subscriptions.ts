import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One row per user. Default = free tier.
 * status:    "free" | "trialing" | "active" | "past_due" | "canceled"
 * plan:      "free" | "monthly" | "six_month" | "yearly"
 * provider:  "none" | "stripe" | "revenuecat" (future)
 */
export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("free"),
    provider: text("provider").notNull().default("none"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: integer("cancel_at_period_end").notNull().default(0),
    // Phone number associated with the subscription — populated when the user
    // authenticates via phone OTP. Lets admin grants and lookups work for
    // phone-only users who have no email address.
    phoneNumber: text("phone_number"),
    // Referral system fields
    referralCode: text("referral_code").unique(),
    referralRewardsGranted: integer("referral_rewards_granted").notNull().default(0),
    // Premium extension granted by the referral system. Independent from the
    // paid-period end so a paid renewal webhook never shrinks bonus time.
    bonusExpiresAt: timestamp("bonus_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;

/**
 * One row per (user, day, feature). Used to rate-limit free-tier features
 * such as Amy AI queries.  feature: "ai_query" | "coach_view" etc.
 */
export const usageDailyTable = pgTable(
  "usage_daily",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    feature: text("feature").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD UTC
    count: integer("count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDayFeatureIdx: uniqueIndex("usage_daily_user_day_feature_idx").on(t.userId, t.day, t.feature),
  }),
);

export const insertUsageDailySchema = createInsertSchema(usageDailyTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUsageDaily = z.infer<typeof insertUsageDailySchema>;
export type UsageDaily = typeof usageDailyTable.$inferSelect;
