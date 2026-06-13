#!/usr/bin/env node
/**
 * Ensure demo@amynest.in has an infant child profile for infant audio E2E cert.
 *
 *   DATABASE_URL='postgresql://...' node scripts/ensure-demo-infant-child.mjs
 *   DATABASE_URL='...' node scripts/ensure-demo-infant-child.mjs --dry-run
 */
import pg from "pg";

const { Pool } = pg;
const DRY_RUN = process.argv.includes("--dry-run");
const INFANT_NAME = process.env.DEMO_INFANT_CHILD_NAME?.trim() || "Audit-Infant";
const ANCHOR_CHILD_NAME = process.env.DEMO_ANCHOR_CHILD_NAME?.trim() || "Audit-Toddler";

function normalizeDatabaseUrl(url) {
  try {
    const u = new URL(url);
    if (/^dpg-[a-z0-9]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  console.error("ERROR: DATABASE_URL is required.");
  process.exit(1);
}

const url = normalizeDatabaseUrl(raw);
const needsSsl = /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(url);
const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 20_000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  const anchor = await pool.query(
    `SELECT user_id FROM children WHERE name ILIKE $1 ORDER BY id ASC LIMIT 1`,
    [ANCHOR_CHILD_NAME],
  );
  const userId = anchor.rows[0]?.user_id;
  if (!userId) {
    console.error(`FAIL — no child named "${ANCHOR_CHILD_NAME}" to resolve demo userId.`);
    process.exit(1);
  }

  const existing = await pool.query(
    `SELECT id, name, age, age_months
     FROM children
     WHERE user_id = $1
       AND (age = 0 AND age_months < 12 OR name ILIKE $2)
     ORDER BY id ASC
     LIMIT 1`,
    [userId, INFANT_NAME],
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];
    console.log(
      `OK — infant child already exists: id=${row.id} name=${row.name} age=${row.age}m+${row.age_months}`,
    );
    process.exit(0);
  }

  const insertSql = `
    INSERT INTO children (
      user_id, name, age, age_months, selected_age_band, dob_is_estimated,
      school_start_time, school_end_time, goals, wake_up_time, sleep_time,
      travel_mode, food_type, education_stage, learning_environment
    ) VALUES (
      $1, $2, 0, 6, 'under_1', true,
      '08:00', '14:00', 'Infant audio certification profile', '07:00', '19:00',
      'car', 'veg', 'at_home', 'home'
    )
    RETURNING id, name, age, age_months
  `;

  if (DRY_RUN) {
    console.log(`DRY-RUN — would insert "${INFANT_NAME}" for userId=${userId}`);
    process.exit(0);
  }

  const inserted = await pool.query(insertSql, [userId, INFANT_NAME]);
  const row = inserted.rows[0];
  console.log(
    `CREATED — infant child id=${row.id} name=${row.name} age=${row.age}m+${row.age_months} userId=${userId}`,
  );
} catch (err) {
  console.error("FAIL —", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await pool.end();
}
