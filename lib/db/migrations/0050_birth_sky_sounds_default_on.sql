-- Amy Astro public launch: sky sounds default ON for new preference rows.
-- Existing rows keep their stored value.

ALTER TABLE "birth_sky_preferences"
  ALTER COLUMN "sky_sounds" SET DEFAULT true;
