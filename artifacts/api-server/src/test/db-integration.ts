import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

let cached: boolean | null = null;

/** True when Postgres accepts a simple query (integration tests can run). */
export async function isDbIntegrationAvailable(): Promise<boolean> {
  if (cached != null) return cached;
  try {
    await db.execute(sql`SELECT 1`);
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}
