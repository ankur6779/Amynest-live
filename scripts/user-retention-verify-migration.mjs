#!/usr/bin/env node
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("render.com") ? { rejectUnauthorized: false } : undefined,
});

try {
  const t = await pool.query(
    "SELECT to_regclass('public.user_retention') IS NOT NULL AS exists",
  );
  if (!t.rows[0]?.exists) {
    console.error("user_retention table missing");
    process.exit(1);
  }

  const idx = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'user_retention' ORDER BY indexname",
  );
  const names = idx.rows.map((r) => r.indexname);
  console.log("indexes:", names.join(", "));

  for (const required of ["user_retention_user_idx", "user_retention_last_active_idx"]) {
    if (!names.includes(required)) {
      console.error(`${required} index missing`);
      process.exit(1);
    }
  }

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_retention'
     ORDER BY ordinal_position`,
  );
  const columnNames = cols.rows.map((r) => r.column_name);
  console.log("columns:", columnNames.length);

  for (const required of [
    "user_id",
    "current_streak",
    "daily_goals",
    "resume_items",
    "inactive_days",
    "winback_level",
  ]) {
    if (!columnNames.includes(required)) {
      console.error(`column ${required} missing`);
      process.exit(1);
    }
  }

  console.log("user_retention migration verified OK");
} finally {
  await pool.end();
}
