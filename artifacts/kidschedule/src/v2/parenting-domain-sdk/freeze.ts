/**
 * freezeDomain — deep-freeze any domain / problem structure.
 * Pure utility. No ownership.
 */

export function freezeDomain<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;

  if (Array.isArray(value)) {
    for (const item of value) freezeDomain(item);
    return Object.freeze(value) as T;
  }

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    freezeDomain(obj[key]);
  }
  return Object.freeze(value);
}
