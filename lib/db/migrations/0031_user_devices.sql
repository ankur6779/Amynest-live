CREATE TABLE IF NOT EXISTS "user_devices" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "device_id" text NOT NULL,
  "device_name" text,
  "platform" text DEFAULT 'unknown' NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_active" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_user_device_idx"
  ON "user_devices" ("user_id", "device_id");

CREATE INDEX IF NOT EXISTS "user_devices_user_id_idx"
  ON "user_devices" ("user_id");

CREATE INDEX IF NOT EXISTS "user_devices_user_active_idx"
  ON "user_devices" ("user_id", "is_active");
