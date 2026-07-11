import {
  pgTable,
  bigserial,
  text,
  jsonb,
  timestamp,
  bigint,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Production startup funnel telemetry — pre-auth, append-only.
 * Separate from analytics_events for rich device context and SQL diagnostics.
 */
export const startupFunnelEventsTable = pgTable(
  "startup_funnel_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventName: text("event_name").notNull(),
    eventType: text("event_type").notNull().default("milestone"),
    clientTs: timestamp("client_ts", { withTimezone: true }),
    serverTs: timestamp("server_ts", { withTimezone: true }).notNull().defaultNow(),
    elapsedMs: bigint("elapsed_ms", { mode: "number" }),
    sessionId: text("session_id").notNull(),
    installId: text("install_id").notNull(),
    deviceId: text("device_id").notNull(),
    deviceModel: text("device_model"),
    manufacturer: text("manufacturer"),
    androidVersion: text("android_version"),
    webviewVersion: text("webview_version"),
    appVersion: text("app_version"),
    buildNumber: text("build_number"),
    networkType: text("network_type"),
    carrier: text("carrier"),
    locale: text("locale"),
    timezone: text("timezone"),
    memoryClass: text("memory_class"),
    batterySaver: boolean("battery_saver"),
    platform: text("platform"),
    country: text("country"),
    language: text("language"),
    screenWidth: integer("screen_width"),
    screenHeight: integer("screen_height"),
    cpuArchitecture: text("cpu_architecture"),
    playStoreVersion: text("play_store_version"),
    startupPhase: text("startup_phase"),
    startType: text("start_type"),
    failureStack: text("failure_stack"),
    failureFile: text("failure_file"),
    failureLine: integer("failure_line"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({
    eventServerIdx: index("startup_funnel_events_event_server_idx").on(
      t.eventName,
      t.serverTs,
    ),
    deviceServerIdx: index("startup_funnel_events_device_server_idx").on(
      t.deviceId,
      t.serverTs,
    ),
    installServerIdx: index("startup_funnel_events_install_server_idx").on(
      t.installId,
      t.serverTs,
    ),
    sessionIdx: index("startup_funnel_events_session_idx").on(t.sessionId),
    manufacturerIdx: index("startup_funnel_events_manufacturer_idx").on(
      t.manufacturer,
      t.serverTs,
    ),
    androidVersionIdx: index("startup_funnel_events_android_version_idx").on(
      t.androidVersion,
      t.serverTs,
    ),
    typeServerIdx: index("startup_funnel_events_type_server_idx").on(
      t.eventType,
      t.serverTs,
    ),
  }),
);

export const insertStartupFunnelEventSchema = createInsertSchema(
  startupFunnelEventsTable,
).omit({ id: true, serverTs: true });

export type StartupFunnelEventRow = typeof startupFunnelEventsTable.$inferSelect;
export type InsertStartupFunnelEvent = z.infer<typeof insertStartupFunnelEventSchema>;
