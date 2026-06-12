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
    "SELECT to_regclass('public.health_lab_progress') IS NOT NULL AS exists",
  );
  if (!t.rows[0]?.exists) {
    console.error("health_lab_progress missing");
    process.exit(1);
  }

  const idx = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'health_lab_progress'",
  );
  const names = idx.rows.map((r) => r.indexname);
  console.log("indexes:", names.join(", "));
  if (!names.includes("health_lab_progress_child_uq")) {
    console.error("child_uq index missing");
    process.exit(1);
  }

  const dup = await pool.query(
    "SELECT child_id, COUNT(*) AS n FROM health_lab_progress GROUP BY child_id HAVING COUNT(*) > 1",
  );
  if (dup.rowCount > 0) {
    console.error("duplicate child rows");
    process.exit(1);
  }

  console.log("health_lab_progress migration verified OK");
} finally {
  await pool.end();
}
