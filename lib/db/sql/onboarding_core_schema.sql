-- Core tables required for onboarding save (idempotent — safe to run multiple times).
-- Prefer `pnpm --filter @workspace/db push` for full schema sync; use this for manual prod repair.

-- ── children ────────────────────────────────────────────────────────────────
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
);

ALTER TABLE children ADD COLUMN IF NOT EXISTS fixed_activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE children ADD COLUMN IF NOT EXISTS parent_goals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE children ADD COLUMN IF NOT EXISTS energy_profile JSONB;
ALTER TABLE children ADD COLUMN IF NOT EXISTS food_pref_inherited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE children ADD COLUMN IF NOT EXISTS food_pref_customized BOOLEAN NOT NULL DEFAULT false;
UPDATE children SET fixed_activities = '[]'::jsonb WHERE fixed_activities IS NULL;

-- ── parent_profiles ─────────────────────────────────────────────────────────
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
);

ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS diet_type TEXT;
ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS food_style TEXT;
ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS sub_cuisine TEXT;
ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS free_slots JSONB DEFAULT '[]'::jsonb;

-- ── subscriptions ─────────────────────────────────────────────────────────
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
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referral_rewards_granted INTEGER NOT NULL DEFAULT 0;

-- ── onboarding_profiles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_profiles (
  id                   SERIAL PRIMARY KEY,
  user_id              TEXT NOT NULL UNIQUE,
  children             JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent               JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_goal        TEXT,
  onboarding_complete  BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
