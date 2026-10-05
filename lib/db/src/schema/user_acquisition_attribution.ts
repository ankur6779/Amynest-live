import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Durable first-touch acquisition fact. Product analytics remain in
 * analytics_events; this row is the join key from device → canonical user
 * → Ads click ids. First-touch click ids are never overwritten with null.
 */
export const userAcquisitionAttributionTable = pgTable(
  "user_acquisition_attribution",
  {
    id: serial("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    canonicalUserId: text("canonical_user_id"),
    firebaseUid: text("firebase_uid"),
    installSource: text("install_source").notNull().default("unknown"),
    gclid: text("gclid"),
    gbraid: text("gbraid"),
    wbraid: text("wbraid"),
    campaignId: text("campaign_id"),
    firstTouchAt: timestamp("first_touch_at", { withTimezone: true }).notNull(),
    lastTouchAt: timestamp("last_touch_at", { withTimezone: true }).notNull(),
    sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
    attributionStatus: text("attribution_status").notNull().default("ATTRIBUTION_UNKNOWN"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceUnique: uniqueIndex("user_acquisition_attribution_device_uq").on(t.deviceId),
    canonicalIdx: index("user_acquisition_attribution_canonical_idx").on(t.canonicalUserId),
    firebaseIdx: index("user_acquisition_attribution_firebase_idx").on(t.firebaseUid),
  }),
);

export const adsConversionUploadLedgerTable = pgTable(
  "ads_conversion_upload_ledger",
  {
    id: serial("id").primaryKey(),
    transactionId: text("transaction_id").notNull(),
    conversionAction: text("conversion_action").notNull(),
    clickId: text("click_id"),
    clickIdType: text("click_id_type"),
    conversionAt: timestamp("conversion_at", { withTimezone: true }).notNull(),
    currency: text("currency").notNull().default("INR"),
    valueMicros: text("value_micros"),
    status: text("status").notNull().default("prepared"),
    canonicalUserId: text("canonical_user_id"),
    eventName: text("event_name").notNull().default("purchase"),
    eventTime: timestamp("event_time", { withTimezone: true }).notNull(),
    gclid: text("gclid"),
    gbraid: text("gbraid"),
    wbraid: text("wbraid"),
    campaignId: text("campaign_id"),
    source: text("source").notNull().default("revenuecat_webhook"),
    dedupeKey: text("dedupe_key").notNull(),
    uploadStatus: text("upload_status").notNull().default("blocked_ads_paused"),
    uploadAttempts: integer("upload_attempts").notNull().default(0),
    lastUploadAttemptAt: timestamp("last_upload_attempt_at", { withTimezone: true }),
    lastUploadError: text("last_upload_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    txnActionUnique: uniqueIndex("ads_conversion_upload_ledger_txn_action_uq").on(
      t.transactionId,
      t.conversionAction,
    ),
    dedupeUnique: uniqueIndex("ads_conversion_upload_ledger_dedupe_uq").on(t.dedupeKey),
    canonicalIdx: index("ads_conversion_upload_ledger_canonical_idx").on(t.canonicalUserId),
  }),
);

export type UserAcquisitionAttribution = typeof userAcquisitionAttributionTable.$inferSelect;
export type AdsConversionUploadLedger = typeof adsConversionUploadLedgerTable.$inferSelect;
