import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
const POOL_MAX = Number(process.env.PG_POOL_MAX ?? "25");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isFinite(POOL_MAX) && POOL_MAX > 0 ? POOL_MAX : 25,
});
pool.on("error", (err) => {
  console.error("Unexpected PG pool error (kept alive):", err.message);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
