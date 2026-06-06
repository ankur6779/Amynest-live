/**
 * Canonical notification fingerprint used for deduplication, cooldowns,
 * and stable Android notification IDs.
 *
 * Format: ${childId}_${notificationType}_${entityId}_${scheduledDate}
 */
export function buildNotificationFingerprint(input: {
  childId?: number | string | null;
  notificationType: string;
  entityId: string;
  scheduledDate: string;
}): string {
  const child =
    input.childId != null && String(input.childId).length > 0
      ? String(input.childId)
      : "account";
  const type = sanitizeFingerprintSegment(input.notificationType);
  const entity = sanitizeFingerprintSegment(input.entityId);
  const date = input.scheduledDate.slice(0, 10);
  return `${child}_${type}_${entity}_${date}`;
}

export function sanitizeFingerprintSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** Deterministic positive 31-bit int for Android NotificationManager.notify(id). */
export function stableNotificationId(fingerprint: string): number {
  let hash = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) & 0x7fffffff;
}

export function parseFingerprintChildId(fingerprint: string): string | null {
  const first = fingerprint.split("_")[0];
  if (!first || first === "account") return null;
  return first;
}

export function scheduledDateFromFingerprint(fingerprint: string): string | null {
  const parts = fingerprint.split("_");
  const last = parts[parts.length - 1];
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return null;
  return last;
}
