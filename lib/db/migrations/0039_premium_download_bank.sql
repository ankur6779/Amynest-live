-- Premium Download Bank
-- Paid subscribers receive 5 new worksheet downloads per day. Unused daily
-- allocation rolls into a capped bank; trials and free users do not roll over.

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "download_bank_balance" integer NOT NULL DEFAULT 0;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "daily_download_allocation" integer NOT NULL DEFAULT 5;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "last_download_refresh_at" timestamptz;
