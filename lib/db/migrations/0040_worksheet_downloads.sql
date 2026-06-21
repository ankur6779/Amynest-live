-- Printable Worksheets server-side download ledger.
-- Mirrors coloring_downloads / funsheet_downloads so quotas, premium bank
-- usage, and no-charge re-downloads are enforced by the API instead of localStorage.

CREATE TABLE IF NOT EXISTS "worksheet_downloads" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "child_id" integer NOT NULL,
  "file_id" text NOT NULL,
  "file_name" text NOT NULL,
  "downloaded_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "worksheet_downloads_child_file_uniq"
  ON "worksheet_downloads" ("child_id", "file_id");

CREATE INDEX IF NOT EXISTS "worksheet_downloads_child_idx"
  ON "worksheet_downloads" ("child_id");

CREATE INDEX IF NOT EXISTS "worksheet_downloads_user_idx"
  ON "worksheet_downloads" ("user_id");

CREATE INDEX IF NOT EXISTS "worksheet_downloads_daily_quota_idx"
  ON "worksheet_downloads" ("user_id", "child_id", "downloaded_at");
