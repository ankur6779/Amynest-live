#!/usr/bin/env node
/**
 * Quick DATABASE_URL connectivity check before drizzle push.
 *   DATABASE_URL='postgresql://...' node scripts/test-db-connection.mjs
 */
import pg from "pg";

const { Pool } = pg;

const MAX_ATTEMPTS = Number(process.env.DB_CONNECT_ATTEMPTS ?? 3);
const CONNECT_TIMEOUT_MS = Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 30_000);
const RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 4_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function tryConnect(url, needsSsl) {
  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();
    const { rows } = await client.query("SELECT current_database(), version()");
    console.log("OK — connected to:", rows[0]?.current_database);
    console.log("Host:", new URL(url).hostname);
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    await pool.end().catch(() => undefined);
    throw err;
  }
}

const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const url = normalizeDatabaseUrl(raw);
const needsSsl = /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(url);

let lastError;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    if (attempt > 1) {
      console.log(`Retrying DB connection (${attempt}/${MAX_ATTEMPTS})...`);
    }
    await tryConnect(url, needsSsl);
    process.exit(0);
  } catch (err) {
    lastError = err;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`);
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

console.error("FAIL — could not connect after retries:");
console.error(lastError instanceof Error ? lastError.message : lastError);
console.error("\nCheck External URL from Render, password URL-encoding, and sslmode=require.");
process.exit(1);
