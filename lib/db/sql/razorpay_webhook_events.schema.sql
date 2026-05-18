-- Razorpay webhook idempotency log (event_id = Razorpay's event id).
-- Safe to run multiple times on startup.

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT,
  payload      JSONB,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE razorpay_webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE razorpay_webhook_events ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE razorpay_webhook_events
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT now();
