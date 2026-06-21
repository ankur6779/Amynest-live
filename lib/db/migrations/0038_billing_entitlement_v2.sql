-- Billing & Entitlement System V2
-- Add provider lifecycle metadata without replacing the existing subscriptions summary row.

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "subscription_state" text NOT NULL DEFAULT 'FREE';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "store" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "environment" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revenuecat_app_user_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "original_app_user_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "product_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "entitlement_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "original_transaction_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "latest_transaction_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_event_type" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_event_at" timestamptz;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "grace_period_expires_at" timestamptz;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "auto_renew_status" boolean;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "expired_at" timestamptz;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_reconciled_at" timestamptz;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "sync_error" text;

CREATE INDEX IF NOT EXISTS "subscriptions_provider_sub_idx"
  ON "subscriptions" ("provider", "provider_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_original_transaction_idx"
  ON "subscriptions" ("original_transaction_id");
CREATE INDEX IF NOT EXISTS "subscriptions_state_period_idx"
  ON "subscriptions" ("subscription_state", "current_period_end");

ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "processed_at" timestamptz;
ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "processing_status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "processing_error" text;
ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "event_timestamp" timestamptz;
ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "transaction_id" text;
ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "original_transaction_id" text;
ALTER TABLE "revenuecat_webhook_events" ADD COLUMN IF NOT EXISTS "environment" text;

CREATE INDEX IF NOT EXISTS "revenuecat_webhook_events_app_user_received_idx"
  ON "revenuecat_webhook_events" ("app_user_id", "received_at");
CREATE INDEX IF NOT EXISTS "revenuecat_webhook_events_processing_status_idx"
  ON "revenuecat_webhook_events" ("processing_status", "received_at");
CREATE INDEX IF NOT EXISTS "revenuecat_webhook_events_transaction_idx"
  ON "revenuecat_webhook_events" ("transaction_id");

CREATE TABLE IF NOT EXISTS "billing_audit_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text,
  "provider" text NOT NULL DEFAULT 'revenuecat',
  "source" text NOT NULL,
  "event_name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ok',
  "provider_event_id" text,
  "from_state" text,
  "to_state" text,
  "reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "billing_audit_events_user_created_idx"
  ON "billing_audit_events" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "billing_audit_events_event_created_idx"
  ON "billing_audit_events" ("event_name", "created_at");
CREATE INDEX IF NOT EXISTS "billing_audit_events_provider_event_idx"
  ON "billing_audit_events" ("provider", "provider_event_id");
