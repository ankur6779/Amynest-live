#!/usr/bin/env node
/**
 * Verify user_devices table + metadata columns after drizzle push.
 *   DATABASE_URL=postgresql://... node scripts/device-limit-verify-migration.mjs
 */
import pg from "pg";

const { Pool } = pg;

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
  console.error("ERROR: DATABASE_URL is required");
  process.exit(1);
}

const url = normalizeDatabaseUrl(raw);
const needsSsl = /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(url);
const pool = new Pool({
  connectionString: url,
  max: 1,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

const REQUIRED_COLUMNS = [
  "user_id",
  "device_id",
  "device_name",
  "platform",
  "browser",
  "os",
  "app_version",
  "last_ip_hash",
  "first_seen_at",
  "last_seen_at",
  "is_active",
];

try {
  const table = await pool.query(
    "SELECT to_regclass('public.user_devices') IS NOT NULL AS exists",
  );
  if (!table.rows[0]?.exists) {
    console.error("FAIL — user_devices table missing");
    process.exit(1);
  }
  console.log("OK — user_devices table exists");

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_devices'
     ORDER BY ordinal_position`,
  );
  const found = new Set(cols.rows.map((r) => r.column_name));
  const missing = REQUIRED_COLUMNS.filter((c) => !found.has(c));
  if (missing.length) {
    console.error("FAIL — missing columns:", missing.join(", "));
    process.exit(1);
  }
  console.log("OK — columns:", REQUIRED_COLUMNS.join(", "));

  const idx = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'user_devices' ORDER BY indexname`,
  );
  console.log("indexes:", idx.rows.map((r) => r.indexname).join(", "));
  const hasUnique = idx.rows.some((r) => r.indexname === "user_devices_user_device_idx");
  if (!hasUnique) {
    console.error("FAIL — user_devices_user_device_idx missing");
    process.exit(1);
  }
  console.log("device limit migration verified OK");
} finally {
  await pool.end();
}
