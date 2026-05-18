/** Safe `location.startsWith` — wouter location should always be a string. */
export function safePathStartsWith(
  location: string | null | undefined,
  prefix: string,
): boolean {
  if (!location || !prefix) return false;
  try {
    return location === prefix || location.startsWith(prefix);
  } catch {
    return false;
  }
}

export function safePathStartsWithSegment(
  location: string | null | undefined,
  prefix: string,
): boolean {
  if (!location || !prefix) return false;
  try {
    return location === prefix || location.startsWith(`${prefix}/`);
  } catch {
    return false;
  }
}
