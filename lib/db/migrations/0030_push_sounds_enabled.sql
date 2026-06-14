ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "push_sounds_enabled" boolean NOT NULL DEFAULT true;
