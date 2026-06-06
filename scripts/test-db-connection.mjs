#!/usr/bin/env node
/**
 * Quick DATABASE_URL connectivity check before drizzle push.
 *   DATABASE_URL='postgresql://...' node scripts/test-db-connection.mjs
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
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const url = normalizeDatabaseUrl(raw);
const needsSsl = /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(url);

const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 15_000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  const client = await pool.connect();
  const { rows } = await client.query("SELECT current_database(), version()");
  console.log("OK — connected to:", rows[0]?.current_database);
  console.log("Host:", new URL(url).hostname);
  client.release();
  await pool.end();
} catch (err) {
  console.error("FAIL — could not connect:");
  console.error(err instanceof Error ? err.message : err);
  console.error("\nCheck External URL from Render, password URL-encoding, and sslmode=require.");
  process.exit(1);
}
