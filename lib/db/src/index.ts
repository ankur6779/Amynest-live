import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { databaseUrlNeedsSsl, normalizeDatabaseUrl } from "./database-url";

const { Pool } = pg;
const POOL_MAX = Number(process.env.PG_POOL_MAX ?? "25");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const needsSsl = databaseUrlNeedsSsl(databaseUrl);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number.isFinite(POOL_MAX) && POOL_MAX > 0 ? POOL_MAX : 25,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
pool.on("error", (err) => {
  console.error("Unexpected PG pool error (kept alive):", err.message);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
