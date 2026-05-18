import { index, pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    platform: text("platform").notNull().default("unknown"),
    deviceName: text("device_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("push_tokens_token_idx").on(t.token),
    userIdIdx: index("push_tokens_user_id_idx").on(t.userId),
  }),
);

export type PushToken = typeof pushTokensTable.$inferSelect;
export type InsertPushToken = typeof pushTokensTable.$inferInsert;
