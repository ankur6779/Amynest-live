ALTER TABLE "user_devices"
  ADD COLUMN IF NOT EXISTS "browser" text,
  ADD COLUMN IF NOT EXISTS "os" text,
  ADD COLUMN IF NOT EXISTS "app_version" text,
  ADD COLUMN IF NOT EXISTS "last_ip_hash" text;
