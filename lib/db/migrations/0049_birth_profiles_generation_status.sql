-- Birth Sky first-sky lifecycle status on birth_profiles.
-- PENDING → COMPUTING → READY | FAILED. Snapshot rows are only written when READY.

ALTER TABLE "birth_profiles"
  ADD COLUMN IF NOT EXISTS "generation_status" text NOT NULL DEFAULT 'PENDING';
