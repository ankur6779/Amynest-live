-- Parent Hub download ledgers for Drive-backed printable content.
-- Required by worksheet/coloring/funsheet list + download APIs and the
-- premium download wallet, which counts usage across all three tables.

CREATE TABLE IF NOT EXISTS "coloring_downloads" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "child_id" integer NOT NULL,
  "file_id" text NOT NULL,
  "file_name" text NOT NULL,
  "downloaded_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "coloring_downloads_child_file_uniq"
  ON "coloring_downloads" ("child_id", "file_id");

CREATE INDEX IF NOT EXISTS "coloring_downloads_child_idx"
  ON "coloring_downloads" ("child_id");

CREATE INDEX IF NOT EXISTS "coloring_downloads_user_idx"
  ON "coloring_downloads" ("user_id");

CREATE INDEX IF NOT EXISTS "coloring_downloads_daily_quota_idx"
  ON "coloring_downloads" ("user_id", "child_id", "downloaded_at");

CREATE TABLE IF NOT EXISTS "funsheet_downloads" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "child_id" integer NOT NULL,
  "file_id" text NOT NULL,
  "file_name" text NOT NULL,
  "downloaded_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "funsheet_downloads_child_file_uniq"
  ON "funsheet_downloads" ("child_id", "file_id");

CREATE INDEX IF NOT EXISTS "funsheet_downloads_child_idx"
  ON "funsheet_downloads" ("child_id");

CREATE INDEX IF NOT EXISTS "funsheet_downloads_user_idx"
  ON "funsheet_downloads" ("user_id");

CREATE INDEX IF NOT EXISTS "funsheet_downloads_daily_quota_idx"
  ON "funsheet_downloads" ("user_id", "child_id", "downloaded_at");

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
