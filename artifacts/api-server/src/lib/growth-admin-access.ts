function parseList(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Growth OS + growth intelligence admin gate (UID allowlist or trusted demo email). */
export function isGrowthAdminUser(
  userId: string | null | undefined,
  email: string | null | undefined,
): boolean {
  if (userId) {
    const uids = parseList("ADMIN_USER_IDS");
    if (uids.includes(userId)) return true;
  }

  const normalized = email?.toLowerCase().trim();
  if (!normalized) return false;

  const emails = parseList("ADMIN_GROWTH_EMAILS");
  return emails.some((e) => e.toLowerCase() === normalized);
}
