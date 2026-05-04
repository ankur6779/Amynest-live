import { pgTable, text, serial, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const debugLogsTable = pgTable(
  "debug_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    platform: text("platform").notNull(),
    screen: text("screen").notNull(),
    appVersion: text("app_version"),
    sessionId: text("session_id"),
    userContext: jsonb("user_context"),
    apiCalls: jsonb("api_calls"),
    features: jsonb("features"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPlatformIdx: index("debug_logs_user_platform_idx").on(t.userId, t.platform),
    userScreenIdx: index("debug_logs_user_screen_idx").on(t.userId, t.screen),
    createdAtIdx: index("debug_logs_created_at_idx").on(t.createdAt),
  }),
);

export type DebugLog = typeof debugLogsTable.$inferSelect;
export type InsertDebugLog = typeof debugLogsTable.$inferInsert;
