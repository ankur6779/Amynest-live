import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger.js";

/** Session-scoped advisory lock for cron jobs (released when DB session ends). */
export async function tryAcquireCronAdvisoryLock(jobName: string): Promise<boolean> {
  const result = await db.execute<{ acquired: boolean }>(sql`
    SELECT pg_try_advisory_lock(hashtext(${jobName})) AS acquired
  `);
  return result.rows[0]?.acquired === true;
}

export async function releaseCronAdvisoryLock(jobName: string): Promise<void> {
  try {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${jobName}))`);
  } catch (err) {
    logger.warn({ err, job: jobName }, "Failed to release cron advisory lock");
  }
}

/**
 * Runs `fn` only when the advisory lock for `jobName` is acquired.
 * Skips silently when another instance or overlapping tick holds the lock.
 */
export async function withCronAdvisoryLock<T>(
  jobName: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const acquired = await tryAcquireCronAdvisoryLock(jobName);
  if (!acquired) {
    logger.debug({ job: jobName }, "Cron tick skipped — advisory lock held");
    return undefined;
  }
  try {
    return await fn();
  } finally {
    await releaseCronAdvisoryLock(jobName);
  }
}
