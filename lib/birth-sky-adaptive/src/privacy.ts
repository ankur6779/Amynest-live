/**
 * Privacy guards — strip identifiers before scoring.
 * Adaptive Engine never accepts or emits personal identifiers.
 */

const FORBIDDEN_KEYS = new Set([
  "userid",
  "user_id",
  "childid",
  "child_id",
  "email",
  "name",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "phone",
  "deviceid",
  "device_id",
  "token",
]);

export function sanitizeTypeTag(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().replace(/[\s-]+/g, "_").slice(0, 40);
  if (!t) return null;
  if (FORBIDDEN_KEYS.has(t)) return null;
  // Reject values that look like emails or long opaque ids
  if (t.includes("@")) return null;
  if (/^[0-9a-f]{20,}$/i.test(t)) return null;
  return t;
}

export function assertNoIdentifiers(history: unknown): void {
  if (!history || typeof history !== "object") return;
  const walk = (obj: unknown, depth: number): void => {
    if (depth > 4 || !obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(`adaptive_privacy_violation:${key}`);
      }
      if (typeof v === "object" && v !== null) walk(v, depth + 1);
    }
  };
  walk(history, 0);
}
