-- Push notification device tokens.
-- Safe to run multiple times via Drizzle/db migration tooling.

CREATE TABLE IF NOT EXISTS push_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL,
  token        TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'unknown',
  device_name  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_idx ON push_tokens (token);
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens (user_id);
