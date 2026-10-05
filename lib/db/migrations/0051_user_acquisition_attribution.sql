-- Durable first-touch acquisition registry + Ads conversion upload ledger.
-- Additive only. Do not backfill historical gclid.
-- shouldUpload remains false while campaign 23986249354 is paused.

CREATE TABLE IF NOT EXISTS "user_acquisition_attribution" (
  "id" serial PRIMARY KEY NOT NULL,
  "device_id" text NOT NULL,
  "canonical_user_id" text,
  "firebase_uid" text,
  "install_source" text NOT NULL DEFAULT 'unknown',
  "gclid" text,
  "gbraid" text,
  "wbraid" text,
  "campaign_id" text,
  "first_touch_at" timestamptz NOT NULL,
  "last_touch_at" timestamptz NOT NULL,
  "source_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "attribution_status" text NOT NULL DEFAULT 'ATTRIBUTION_UNKNOWN',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_acquisition_attribution_device_uq"
  ON "user_acquisition_attribution" ("device_id");
CREATE INDEX IF NOT EXISTS "user_acquisition_attribution_canonical_idx"
  ON "user_acquisition_attribution" ("canonical_user_id");
CREATE INDEX IF NOT EXISTS "user_acquisition_attribution_firebase_idx"
  ON "user_acquisition_attribution" ("firebase_uid");

CREATE TABLE IF NOT EXISTS "ads_conversion_upload_ledger" (
  "id" serial PRIMARY KEY NOT NULL,
  "transaction_id" text NOT NULL,
  "conversion_action" text NOT NULL,
  "click_id" text,
  "click_id_type" text,
  "conversion_at" timestamptz NOT NULL,
  "currency" text NOT NULL DEFAULT 'INR',
  "value_micros" text,
  "status" text NOT NULL DEFAULT 'prepared',
  "canonical_user_id" text,
  "event_name" text NOT NULL DEFAULT 'purchase',
  "event_time" timestamptz NOT NULL,
  "gclid" text,
  "gbraid" text,
  "wbraid" text,
  "campaign_id" text,
  "source" text NOT NULL DEFAULT 'revenuecat_webhook',
  "dedupe_key" text NOT NULL,
  "upload_status" text NOT NULL DEFAULT 'blocked_ads_paused',
  "upload_attempts" integer NOT NULL DEFAULT 0,
  "last_upload_attempt_at" timestamptz,
  "last_upload_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ads_conversion_upload_ledger_txn_action_uq"
  ON "ads_conversion_upload_ledger" ("transaction_id", "conversion_action");
CREATE UNIQUE INDEX IF NOT EXISTS "ads_conversion_upload_ledger_dedupe_uq"
  ON "ads_conversion_upload_ledger" ("dedupe_key");
CREATE INDEX IF NOT EXISTS "ads_conversion_upload_ledger_canonical_idx"
  ON "ads_conversion_upload_ledger" ("canonical_user_id");
