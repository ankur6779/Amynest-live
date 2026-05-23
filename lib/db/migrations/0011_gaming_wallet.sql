-- Per-user gaming rewards wallet (points, unlocks, play log, ledger)
CREATE TABLE IF NOT EXISTS "gaming_wallet" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "points_balance" integer NOT NULL DEFAULT 0,
  "unlocked_games" jsonb NOT NULL DEFAULT '[]',
  "skills" jsonb NOT NULL DEFAULT '{}',
  "play_log" jsonb NOT NULL DEFAULT '[]',
  "ledger" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "gaming_wallet_user_uq" ON "gaming_wallet" ("user_id");
