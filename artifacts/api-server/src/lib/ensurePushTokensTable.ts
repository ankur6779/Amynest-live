import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Production safety migration for deployments where Drizzle schema changes were
 * shipped before the physical push_tokens table existed.
 */
export async function ensurePushTokensTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id           SERIAL PRIMARY KEY,
      user_id      TEXT NOT NULL,
      token        TEXT NOT NULL,
      platform     TEXT NOT NULL DEFAULT 'unknown',
      device_name  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS device_name TEXT
  `);

  await db.execute(sql`
    ALTER TABLE push_tokens
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_idx ON push_tokens (token)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens (user_id)
  `);

  logger.info("Ensured push_tokens table exists");
}
