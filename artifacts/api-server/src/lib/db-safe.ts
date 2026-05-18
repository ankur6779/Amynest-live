import { logger } from "./logger.js";

/** True when Postgres reports a missing column (42703 / "does not exist"). */
export function isMissingColumnError(err: unknown, column?: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes("does not exist")) return false;
  if (column) {
    return msg.includes(column) || msg.includes(`"${column}"`);
  }
  return true;
}

/**
 * Run a DB operation; on missing-column errors log and return fallback instead of throwing.
 */
export async function withSafeDb<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isMissingColumnError(err)) {
      logger.warn(
        {
          evt: "db.safe_fallback",
          label,
          message: err instanceof Error ? err.message : String(err),
        },
        "DB query failed (missing column) — using safe fallback",
      );
      return fallback;
    }
    throw err;
  }
}
