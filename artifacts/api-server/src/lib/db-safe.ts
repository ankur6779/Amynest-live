import { logger } from "./logger.js";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** True when Postgres reports a missing column (42703 / "does not exist"). */
export function isMissingColumnError(err: unknown, column?: string): boolean {
  const msg = errorMessage(err);
  if (!msg.includes("does not exist")) return false;
  if (column) {
    return msg.includes(column) || msg.includes(`"${column}"`);
  }
  return msg.includes("column");
}

/** True when Postgres reports a missing relation/table (42P01). */
export function isMissingTableError(err: unknown, table?: string): boolean {
  const msg = errorMessage(err);
  if (!msg.includes("does not exist")) return false;
  if (table) {
    return (
      msg.includes(`relation "${table}"`) ||
      msg.includes(`relation ${table}`) ||
      msg.includes(`"${table}"`)
    );
  }
  return msg.includes("relation");
}

/** Missing table, missing column, or other schema drift that should not crash onboarding. */
export function isSchemaMismatchError(err: unknown): boolean {
  const msg = errorMessage(err);
  if (isMissingColumnError(err) || isMissingTableError(err)) return true;
  if (msg.includes("undefined column")) return true;
  if (msg.includes("undefined table")) return true;
  const code = (err as { code?: string })?.code;
  return code === "42P01" || code === "42703";
}

/**
 * Run a DB operation; on schema mismatch log and return fallback instead of throwing.
 */
export async function withSafeDb<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaMismatchError(err)) {
      logger.warn(
        {
          evt: "db.safe_fallback",
          label,
          message: errorMessage(err),
        },
        "DB query failed (schema mismatch) — using safe fallback",
      );
      return fallback;
    }
    throw err;
  }
}
