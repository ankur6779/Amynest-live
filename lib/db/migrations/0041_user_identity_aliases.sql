-- Cross-provider identity aliases for premium entitlement recovery.
-- internal_user_id is currently the canonical Firebase UID that owns subscription rows.

CREATE TABLE IF NOT EXISTS "user_identity_aliases" (
  "id" serial PRIMARY KEY NOT NULL,
  "internal_user_id" text NOT NULL,
  "firebase_uid" text NOT NULL,
  "email" text,
  "normalized_email" text,
  "provider" text NOT NULL DEFAULT 'unknown',
  "email_verified" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_identity_aliases_firebase_uid_uq"
  ON "user_identity_aliases" ("firebase_uid");
CREATE INDEX IF NOT EXISTS "user_identity_aliases_internal_user_idx"
  ON "user_identity_aliases" ("internal_user_id");
CREATE INDEX IF NOT EXISTS "user_identity_aliases_normalized_email_idx"
  ON "user_identity_aliases" ("normalized_email");
CREATE INDEX IF NOT EXISTS "user_identity_aliases_email_verified_idx"
  ON "user_identity_aliases" ("normalized_email", "email_verified");
