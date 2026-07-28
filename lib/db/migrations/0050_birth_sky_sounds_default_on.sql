-- Amy Astro public launch: sky sounds default ON for new preference rows.
-- Existing rows keep their stored value.
-- Applied via scripts/birth-sky-apply-0050-migration.mjs (additive SQL; never drizzle push).

ALTER TABLE "birth_sky_preferences"
  ALTER COLUMN "sky_sounds" SET DEFAULT true;
