import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Idempotent production migrations for tables that may be missing when Drizzle
 * schema shipped before physical tables existed. Safe to run on every startup:
 * uses CREATE/ALTER IF NOT EXISTS and never throws on "already exists".
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

  logger.info({ evt: "db.ensure", table: "push_tokens" }, "Ensured push_tokens table exists");
}

/**
 * Razorpay webhook idempotency log. `event_id` is the Razorpay event id (unique);
 * optional `payload` for debugging; `event_type` used by the webhook handler.
 */
export async function ensureRazorpayWebhookEventsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
      event_id     TEXT PRIMARY KEY,
      event_type   TEXT,
      payload      JSONB,
      received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE razorpay_webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT
  `);

  await db.execute(sql`
    ALTER TABLE razorpay_webhook_events ADD COLUMN IF NOT EXISTS payload JSONB
  `);

  await db.execute(sql`
    ALTER TABLE razorpay_webhook_events
    ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);

  logger.info(
    { evt: "db.ensure", table: "razorpay_webhook_events" },
    "Ensured razorpay_webhook_events table exists",
  );
}

/** Run all startup table ensures (non-throwing per table). */
export async function ensureStartupTables(): Promise<void> {
  const steps: Array<{ name: string; run: () => Promise<void> }> = [
    { name: "push_tokens", run: ensurePushTokensTable },
    { name: "razorpay_webhook_events", run: ensureRazorpayWebhookEventsTable },
  ];

  for (const step of steps) {
    try {
      await step.run();
    } catch (err) {
      logger.error(
        {
          evt: "db.ensure_failed",
          table: step.name,
          err,
          message: err instanceof Error ? err.message : String(err),
        },
        `Failed to ensure table ${step.name}`,
      );
      throw err;
    }
  }
}
