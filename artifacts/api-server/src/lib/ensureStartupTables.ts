import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Idempotent production schema repair for onboarding-critical tables/columns.
 * Safe to run on every startup: CREATE/ALTER IF NOT EXISTS, never throws on
 * "already exists". Individual step failures are logged but do not abort boot.
 */

export async function ensureChildrenTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS children (
      id                    SERIAL PRIMARY KEY,
      user_id               TEXT,
      name                  TEXT NOT NULL,
      dob                   TEXT,
      age                   INTEGER NOT NULL,
      age_months            INTEGER NOT NULL DEFAULT 0,
      is_school_going       BOOLEAN,
      child_class           TEXT,
      school_start_time     TEXT NOT NULL DEFAULT '09:00',
      school_end_time       TEXT NOT NULL DEFAULT '15:00',
      school_days           JSONB,
      wake_up_time          TEXT NOT NULL DEFAULT '07:00',
      sleep_time            TEXT NOT NULL DEFAULT '21:00',
      travel_mode           TEXT NOT NULL DEFAULT 'car',
      travel_mode_other     TEXT,
      food_type             TEXT NOT NULL DEFAULT 'veg',
      goals                 TEXT NOT NULL DEFAULT 'balanced-routine',
      babysitter_id         INTEGER,
      photo_url             TEXT,
      feeding_type          TEXT,
      sleep_pattern         TEXT,
      diet_type             TEXT,
      food_style            TEXT,
      sub_cuisine           TEXT,
      allergies             TEXT,
      food_pref_inherited   BOOLEAN NOT NULL DEFAULT false,
      food_pref_customized  BOOLEAN NOT NULL DEFAULT false,
      parent_goals          JSONB DEFAULT '[]'::jsonb,
      energy_profile        JSONB,
      fixed_activities      JSONB DEFAULT '[]'::jsonb,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE children ADD COLUMN IF NOT EXISTS fixed_activities JSONB DEFAULT '[]'::jsonb
  `);
  await db.execute(sql`
    ALTER TABLE children ADD COLUMN IF NOT EXISTS parent_goals JSONB DEFAULT '[]'::jsonb
  `);
  await db.execute(sql`
    ALTER TABLE children ADD COLUMN IF NOT EXISTS energy_profile JSONB
  `);
  await db.execute(sql`
    ALTER TABLE children ADD COLUMN IF NOT EXISTS food_pref_inherited BOOLEAN NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    ALTER TABLE children ADD COLUMN IF NOT EXISTS food_pref_customized BOOLEAN NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    UPDATE children SET fixed_activities = '[]'::jsonb WHERE fixed_activities IS NULL
  `);

  logger.info({ evt: "db.ensure", table: "children" }, "Ensured children table + columns");
}

export async function ensureParentProfilesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS parent_profiles (
      id                            SERIAL PRIMARY KEY,
      user_id                       TEXT NOT NULL UNIQUE,
      name                          TEXT,
      role                          TEXT NOT NULL DEFAULT 'mother',
      gender                        TEXT,
      mobile_number                 TEXT,
      work_type                     TEXT NOT NULL DEFAULT 'work_from_home',
      work_start_time               TEXT,
      work_end_time                 TEXT,
      free_slots                    JSONB DEFAULT '[]'::jsonb,
      food_type                     TEXT NOT NULL DEFAULT 'non_veg',
      allergies                     TEXT,
      region                        TEXT NOT NULL DEFAULT 'mixed',
      diet_type                     TEXT,
      food_style                    TEXT,
      sub_cuisine                   TEXT,
      email_notifications_enabled   BOOLEAN NOT NULL DEFAULT true,
      last_weekly_recap_sent_at     TIMESTAMPTZ,
      created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS diet_type TEXT`);
  await db.execute(sql`ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS food_style TEXT`);
  await db.execute(sql`ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS sub_cuisine TEXT`);
  await db.execute(sql`ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS free_slots JSONB DEFAULT '[]'::jsonb`);

  logger.info({ evt: "db.ensure", table: "parent_profiles" }, "Ensured parent_profiles table");
}

export async function ensureSubscriptionsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                        SERIAL PRIMARY KEY,
      user_id                   TEXT NOT NULL UNIQUE,
      plan                      TEXT NOT NULL DEFAULT 'free',
      status                    TEXT NOT NULL DEFAULT 'free',
      provider                  TEXT NOT NULL DEFAULT 'none',
      provider_customer_id      TEXT,
      provider_subscription_id  TEXT,
      trial_ends_at             TIMESTAMPTZ,
      current_period_end        TIMESTAMPTZ,
      cancel_at_period_end      INTEGER NOT NULL DEFAULT 0,
      phone_number              TEXT,
      referral_code             TEXT UNIQUE,
      referral_rewards_granted  INTEGER NOT NULL DEFAULT 0,
      bonus_expires_at          TIMESTAMPTZ,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS phone_number TEXT`);
  await db.execute(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ`);
  await db.execute(sql`
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referral_rewards_granted INTEGER NOT NULL DEFAULT 0
  `);

  logger.info({ evt: "db.ensure", table: "subscriptions" }, "Ensured subscriptions table");
}

export async function ensureOnboardingProfilesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS onboarding_profiles (
      id                   SERIAL PRIMARY KEY,
      user_id              TEXT NOT NULL UNIQUE,
      children             JSONB NOT NULL DEFAULT '[]'::jsonb,
      parent               JSONB NOT NULL DEFAULT '{}'::jsonb,
      priority_goal        TEXT,
      onboarding_complete  BOOLEAN NOT NULL DEFAULT false,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  logger.info({ evt: "db.ensure", table: "onboarding_profiles" }, "Ensured onboarding_profiles table");
}

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

/** @deprecated Use ensureChildrenTable — kept for call-site clarity. */
export async function ensureChildrenFixedActivitiesColumn(): Promise<void> {
  await ensureChildrenTable();
}

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

/** Run all startup table ensures (non-throwing per step). */
/** Phonics curriculum engine — daily plans, progress, AI word cache. */
export async function ensurePhonicsCurriculumTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS phonics_curriculum_progress (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      current_level INTEGER NOT NULL DEFAULT 1,
      mastery_score INTEGER NOT NULL DEFAULT 0,
      weak_phonemes JSONB NOT NULL DEFAULT '[]',
      streak INTEGER NOT NULL DEFAULT 0,
      last_played_at TIMESTAMPTZ,
      last_test_score INTEGER,
      last_test_at TIMESTAMPTZ,
      completed_today JSONB NOT NULL DEFAULT '{"date":"","ids":[]}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS phonics_curriculum_progress_child_uq
      ON phonics_curriculum_progress (child_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS phonics_curriculum_progress_user_idx
      ON phonics_curriculum_progress (user_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS phonics_daily_plans (
      id SERIAL PRIMARY KEY,
      child_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      plan_date TEXT NOT NULL,
      plan_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS phonics_daily_plans_child_date_uq
      ON phonics_daily_plans (child_id, plan_date)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS phonics_daily_plans_user_idx
      ON phonics_daily_plans (user_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS phonics_content_cache (
      id SERIAL PRIMARY KEY,
      cache_key TEXT NOT NULL,
      level INTEGER NOT NULL,
      vowel_focus TEXT,
      words JSONB NOT NULL DEFAULT '[]',
      prompt TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'ai',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS phonics_content_cache_key_uq
      ON phonics_content_cache (cache_key)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS phonics_content_cache_level_idx
      ON phonics_content_cache (level)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS phonics_audio_assets (
      id VARCHAR(128) PRIMARY KEY,
      type VARCHAR(32) NOT NULL,
      text TEXT NOT NULL,
      phoneme TEXT,
      alternate_phoneme TEXT,
      difficulty INTEGER,
      curriculum_level INTEGER,
      gcs_path TEXT NOT NULL,
      public_url TEXT,
      duration_ms INTEGER,
      checksum VARCHAR(64),
      version INTEGER NOT NULL DEFAULT 1,
      source VARCHAR(32) NOT NULL DEFAULT 'elevenlabs',
      quality VARCHAR(16) NOT NULL DEFAULT 'auto',
      audio_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS phonics_audio_assets_type_idx
      ON phonics_audio_assets (type)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS phonics_audio_assets_gcs_path_idx
      ON phonics_audio_assets (gcs_path)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS phonics_audio_assets_curriculum_idx
      ON phonics_audio_assets (curriculum_level)
  `);

  logger.info(
    { evt: "db.ensure", table: "phonics_curriculum" },
    "Ensured phonics curriculum tables",
  );
}

export async function ensureInfantCareTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infant_care_logs (
      id          SERIAL PRIMARY KEY,
      child_id    INTEGER NOT NULL,
      user_id     TEXT NOT NULL,
      log_type    TEXT NOT NULL,
      logged_at   TIMESTAMPTZ NOT NULL,
      metadata    JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_care_logs_child_idx ON infant_care_logs (child_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_care_logs_child_logged_idx
      ON infant_care_logs (child_id, logged_at DESC)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infant_growth_measurements (
      id           SERIAL PRIMARY KEY,
      child_id     INTEGER NOT NULL,
      user_id      TEXT NOT NULL,
      weight_kg    REAL,
      height_cm    REAL,
      head_cm      REAL,
      measured_at  TIMESTAMPTZ NOT NULL,
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_growth_measurements_child_idx
      ON infant_growth_measurements (child_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infant_wellbeing_checkins (
      id          SERIAL PRIMARY KEY,
      child_id    INTEGER NOT NULL,
      user_id     TEXT NOT NULL,
      energy      INTEGER NOT NULL,
      stress      INTEGER NOT NULL,
      logged_at   TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_wellbeing_checkins_child_idx
      ON infant_wellbeing_checkins (child_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS child_caregivers (
      id                 SERIAL PRIMARY KEY,
      child_id           INTEGER NOT NULL,
      user_id            TEXT NOT NULL,
      role               TEXT NOT NULL DEFAULT 'co_parent',
      status             TEXT NOT NULL DEFAULT 'pending',
      invite_code        TEXT,
      invited_by_user_id TEXT,
      invited_at         TIMESTAMPTZ,
      accepted_at        TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS child_caregivers_child_user_uniq
      ON child_caregivers (child_id, user_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS child_caregivers_invite_code_idx
      ON child_caregivers (invite_code)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infant_notification_prefs (
      id                 SERIAL PRIMARY KEY,
      user_id            TEXT NOT NULL,
      child_id           INTEGER NOT NULL,
      nap_reminders      BOOLEAN NOT NULL DEFAULT true,
      feed_reminders     BOOLEAN NOT NULL DEFAULT true,
      vaccine_reminders  BOOLEAN NOT NULL DEFAULT true,
      milestone_tips     BOOLEAN NOT NULL DEFAULT true,
      sleep_drift        BOOLEAN NOT NULL DEFAULT false,
      max_per_day        INTEGER NOT NULL DEFAULT 2,
      snooze_until       JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS infant_notification_prefs_user_child_uniq
      ON infant_notification_prefs (user_id, child_id)
  `);

  await db.execute(sql`
    ALTER TABLE notification_preferences
      ADD COLUMN IF NOT EXISTS infant_care_enabled BOOLEAN NOT NULL DEFAULT true
  `);

  logger.info({ evt: "db.ensure", table: "infant_care" }, "Ensured infant care tables");
}

export async function ensureInfantMilestoneProgressTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infant_milestone_progress (
      id            SERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL,
      child_id      INTEGER NOT NULL,
      milestone_id  TEXT NOT NULL,
      state         TEXT NOT NULL,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS infant_milestone_progress_child_milestone_uniq
      ON infant_milestone_progress (child_id, milestone_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_milestone_progress_child_idx
      ON infant_milestone_progress (child_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_milestone_progress_user_idx
      ON infant_milestone_progress (user_id)
  `);

  logger.info(
    { evt: "db.ensure", table: "infant_milestone_progress" },
    "Ensured infant_milestone_progress table",
  );
}

export async function ensureInfantProductAnalyticsEventsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infant_product_analytics_events (
      id               SERIAL PRIMARY KEY,
      user_id          TEXT NOT NULL,
      child_id         INTEGER,
      event            TEXT NOT NULL,
      child_age_months INTEGER,
      infant_age_band  TEXT,
      properties       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_pa_events_event_created_idx
      ON infant_product_analytics_events (event, created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_pa_events_user_created_idx
      ON infant_product_analytics_events (user_id, created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS infant_pa_events_child_created_idx
      ON infant_product_analytics_events (child_id, created_at DESC)
  `);
  logger.info(
    { evt: "db.ensure", table: "infant_product_analytics_events" },
    "Ensured infant product analytics events table",
  );
}

export async function ensurePtmPrepDataTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ptm_prep_data (
      user_id            TEXT PRIMARY KEY,
      draft              JSONB,
      history            JSONB NOT NULL DEFAULT '[]'::jsonb,
      reminders          JSONB NOT NULL DEFAULT '[]'::jsonb,
      client_updated_at  BIGINT NOT NULL DEFAULT 0,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  logger.info({ evt: "db.ensure", table: "ptm_prep_data" }, "Ensured ptm_prep_data table");
}

export async function ensureStartupTables(): Promise<void> {
  const steps: Array<{ name: string; run: () => Promise<void> }> = [
    { name: "children", run: ensureChildrenTable },
    { name: "parent_profiles", run: ensureParentProfilesTable },
    { name: "subscriptions", run: ensureSubscriptionsTable },
    { name: "onboarding_profiles", run: ensureOnboardingProfilesTable },
    { name: "push_tokens", run: ensurePushTokensTable },
    { name: "razorpay_webhook_events", run: ensureRazorpayWebhookEventsTable },
    { name: "phonics_curriculum", run: ensurePhonicsCurriculumTables },
    { name: "infant_care", run: ensureInfantCareTables },
    { name: "infant_milestone_progress", run: ensureInfantMilestoneProgressTable },
    { name: "infant_product_analytics_events", run: ensureInfantProductAnalyticsEventsTable },
    { name: "ptm_prep_data", run: ensurePtmPrepDataTable },
  ];

  const failed: string[] = [];

  for (const step of steps) {
    try {
      await step.run();
    } catch (err) {
      failed.push(step.name);
      logger.error(
        {
          evt: "db.ensure_failed",
          table: step.name,
          err,
          message: err instanceof Error ? err.message : String(err),
        },
        `Failed to ensure schema for ${step.name} — continuing degraded`,
      );
    }
  }

  if (failed.length > 0) {
    logger.warn(
      { evt: "db.ensure_summary", failed, ok: steps.length - failed.length },
      `Schema ensure completed with ${failed.length} failure(s) — onboarding may use fallbacks`,
    );
  } else {
    logger.info(
      { evt: "db.ensure_summary", tables: steps.map((s) => s.name) },
      "Schema ensure: all onboarding-critical tables present",
    );
  }
}
