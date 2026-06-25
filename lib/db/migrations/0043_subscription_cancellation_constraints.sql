-- Subscription cancellation consistency constraints.
--
-- Constraints are added NOT VALID so existing production rows do not block the
-- deploy. PostgreSQL still enforces them for new/updated rows; old rows can be
-- repaired and validated in a later operational migration.

UPDATE "subscriptions"
SET
  "provider" = 'none',
  "plan" = 'free',
  "provider_subscription_id" = NULL,
  "provider_customer_id" = NULL,
  "updated_at" = now()
WHERE "subscription_state" = 'FREE'
  AND (
    "provider" <> 'none'
    OR "plan" <> 'free'
    OR "provider_subscription_id" IS NOT NULL
  );

UPDATE "subscriptions"
SET
  "status" = 'canceled',
  "cancel_at_period_end" = 0,
  "trial_ends_at" = NULL,
  "current_period_end" = LEAST(COALESCE("current_period_end", now()), now()),
  "expires_at" = LEAST(COALESCE("expires_at", now()), now()),
  "expired_at" = COALESCE("expired_at", now()),
  "updated_at" = now()
WHERE "subscription_state" = 'EXPIRED'
  AND (
    "status" NOT IN ('canceled', 'free')
    OR "cancel_at_period_end" <> 0
    OR "trial_ends_at" IS NOT NULL
  );

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_status_known_chk"
  CHECK ("status" IN ('free', 'trialing', 'active', 'past_due', 'canceled')) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_provider_known_chk"
  CHECK ("provider" IN ('none', 'manual', 'razorpay', 'revenuecat', 'stripe')) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_state_known_chk"
  CHECK ("subscription_state" IN ('FREE', 'TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'PAUSED', 'CANCELLED', 'EXPIRED')) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_cancel_at_period_end_bool_chk"
  CHECK ("cancel_at_period_end" IN (0, 1)) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_free_provider_link_chk"
  CHECK (
    "subscription_state" <> 'FREE'
    OR (
      "provider" = 'none'
      AND "plan" = 'free'
      AND "provider_subscription_id" IS NULL
    )
  ) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_trial_shape_chk"
  CHECK (
    "subscription_state" <> 'TRIAL'
    OR (
      "status" = 'trialing'
      AND "trial_ends_at" IS NOT NULL
      AND "cancel_at_period_end" = 0
    )
  ) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_active_shape_chk"
  CHECK (
    "subscription_state" <> 'ACTIVE'
    OR (
      "status" = 'active'
      AND "current_period_end" IS NOT NULL
      AND "cancel_at_period_end" = 0
    )
  ) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_cancelled_shape_chk"
  CHECK (
    "subscription_state" <> 'CANCELLED'
    OR (
      "status" = 'active'
      AND "current_period_end" IS NOT NULL
      AND "cancel_at_period_end" = 1
      AND COALESCE("auto_renew_status", false) = false
    )
  ) NOT VALID;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_expired_shape_chk"
  CHECK (
    "subscription_state" <> 'EXPIRED'
    OR (
      "status" IN ('canceled', 'free')
      AND "cancel_at_period_end" = 0
      AND "expired_at" IS NOT NULL
      AND ("current_period_end" IS NULL OR "current_period_end" <= "expired_at")
    )
  ) NOT VALID;
