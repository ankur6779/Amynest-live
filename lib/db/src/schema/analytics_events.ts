import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Unified, append-only product analytics spine. Every event is validated
 * against @workspace/analytics-taxonomy before it lands here. This is pure
 * measurement infrastructure — it lives above the frozen routine engine and
 * never influences routine generation.
 */
export const analyticsEventsTable = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    eventName: text("event_name").notNull(),
    eventCategory: text("event_category").notNull(),
    sessionId: text("session_id"),
    props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),
    platform: text("platform"),
    appVersion: text("app_version"),
    /** When the client emitted the event (best-effort, client clock). */
    clientTs: timestamp("client_ts", { withTimezone: true }),
    /** When the server accepted the event (authoritative ordering). */
    serverTs: timestamp("server_ts", { withTimezone: true }).notNull().defaultNow(),
    /** Client idempotency key. Null on rows written before the product spine. */
    eventId: text("event_id"),
    anonymousDeviceId: text("anonymous_device_id"),
    /** Server-resolved. Never trust a client-supplied value. */
    canonicalUserId: text("canonical_user_id"),
    firebaseUid: text("firebase_uid"),
    pageName: text("page_name"),
    pagePath: text("page_path"),
    previousPage: text("previous_page"),
    referrerPage: text("referrer_page"),
    routeTransitionId: text("route_transition_id"),
    featureName: text("feature_name"),
    pageVisitId: text("page_visit_id"),
    pageDurationMs: integer("page_duration_ms"),
    interactionType: text("interaction_type"),
    appBuild: text("app_build"),
    osVersion: text("os_version"),
    deviceModel: text("device_model"),
    webviewVersion: text("webview_version"),
    installSource: text("install_source"),
    gclid: text("gclid"),
    gbraid: text("gbraid"),
    wbraid: text("wbraid"),
    campaignId: text("campaign_id"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    attributionStatus: text("attribution_status"),
    networkType: text("network_type"),
    eventSchemaVersion: text("event_schema_version"),
    ingestionStatus: text("ingestion_status").default("accepted"),
  },
  (t) => ({
    eventCreatedIdx: index("analytics_events_event_created_idx").on(
      t.eventName,
      t.serverTs,
    ),
    userCreatedIdx: index("analytics_events_user_created_idx").on(
      t.userId,
      t.serverTs,
    ),
    categoryCreatedIdx: index("analytics_events_category_created_idx").on(
      t.eventCategory,
      t.serverTs,
    ),
    eventIdUq: uniqueIndex("analytics_events_event_id_uq")
      .on(t.eventId)
      .where(sql`${t.eventId} IS NOT NULL AND ${t.eventId} <> ''`),
    propsEventIdUq: uniqueIndex("analytics_events_props_event_id_uq")
      .on(sql`(props->>'event_id')`)
      .where(sql`(props->>'event_id') IS NOT NULL AND (props->>'event_id') <> ''`),
    anonymousDeviceIdx: index("analytics_events_anonymous_device_idx").on(
      t.anonymousDeviceId,
      t.serverTs,
    ),
    canonicalUserIdx: index("analytics_events_canonical_user_idx").on(
      t.canonicalUserId,
      t.serverTs,
    ),
    sessionIdx: index("analytics_events_session_idx").on(t.sessionId, t.serverTs),
    pageNameIdx: index("analytics_events_page_name_idx").on(t.pageName, t.serverTs),
    featureNameIdx: index("analytics_events_feature_name_idx").on(
      t.featureName,
      t.serverTs,
    ),
    platformIdx: index("analytics_events_platform_idx").on(t.platform, t.serverTs),
    appVersionIdx: index("analytics_events_app_version_idx").on(
      t.appVersion,
      t.serverTs,
    ),
    campaignIdx: index("analytics_events_campaign_idx").on(t.campaignId, t.serverTs),
    clientTsIdx: index("analytics_events_client_ts_idx").on(t.clientTs),
  }),
);

export const insertAnalyticsEventSchema = createInsertSchema(
  analyticsEventsTable,
).omit({ id: true, serverTs: true });

export type AnalyticsEventRow = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
