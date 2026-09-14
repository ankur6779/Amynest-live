import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { normalizeDatabaseUrl } from "./database-url";
import { resolvePgSslOptions } from "./ssl-config.js";

const { Pool } = pg;
const POOL_MAX = Number(process.env.PG_POOL_MAX ?? "25");
const STATEMENT_TIMEOUT_MS = Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? "30000");
const statementTimeoutMs =
  Number.isFinite(STATEMENT_TIMEOUT_MS) && STATEMENT_TIMEOUT_MS > 0
    ? Math.floor(STATEMENT_TIMEOUT_MS)
    : 30_000;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number.isFinite(POOL_MAX) && POOL_MAX > 0 ? POOL_MAX : 25,
  ssl: resolvePgSslOptions(databaseUrl),
  options: `-c statement_timeout=${statementTimeoutMs}`,
});
pool.on("error", (err) => {
  console.error("Unexpected PG pool error (kept alive):", err.message);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
