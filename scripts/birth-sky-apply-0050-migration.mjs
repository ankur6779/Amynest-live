#!/usr/bin/env node
/**
 * Apply 0050_birth_sky_sounds_default_on.sql against DATABASE_URL.
 * Additive only — never drizzle-kit push.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(root, "lib/db/migrations/0050_birth_sky_sounds_default_on.sql");
const sql = readFileSync(sqlPath, "utf8");

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("render.com") || url.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await pool.query(sql);
  console.log("Applied 0050_birth_sky_sounds_default_on.sql");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await pool.end();
}
