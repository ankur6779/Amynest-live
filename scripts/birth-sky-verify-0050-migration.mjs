#!/usr/bin/env node
/**
 * Verify birth_sky_preferences.sky_sounds column default is TRUE.
 * Presence-only logging — never prints connection secrets.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
})();

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("render.com") || url.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  const { rows } = await pool.query(`
    SELECT column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'birth_sky_preferences'
      AND column_name = 'sky_sounds'
  `);
  const def = rows[0]?.column_default ?? null;
  console.log(JSON.stringify({ host, sky_sounds_default: def }, null, 2));
  const ok =
    typeof def === "string" &&
    (def === "true" || def.includes("true") || def === "TRUE");
  if (!ok) {
    console.error("FAIL: sky_sounds default is not true");
    process.exit(1);
  }
  console.log("VERIFY_OK sky_sounds default true");
} catch (err) {
  console.error("Verify failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await pool.end();
}
