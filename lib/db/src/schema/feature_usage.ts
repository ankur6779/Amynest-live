import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const featureUsageTable = pgTable(
  "feature_usage",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    featureId: varchar("feature_id", { length: 64 }).notNull(),
    hasUsedOnce: boolean("has_used_once").notNull().default(true),
    useCount: integer("use_count").notNull().default(1),
    firstUsedAt: timestamp("first_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    convertedToPremium: boolean("converted_to_premium").notNull().default(false),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
  },
  (t) => ({
    userFeatureUq: uniqueIndex("feature_usage_user_feature_uq").on(
      t.userId,
      t.featureId,
    ),
    userIdx: index("feature_usage_user_idx").on(t.userId),
    featureIdx: index("feature_usage_feature_idx").on(t.featureId),
  }),
);

export type FeatureUsageRow = typeof featureUsageTable.$inferSelect;
export type InsertFeatureUsage = typeof featureUsageTable.$inferInsert;
