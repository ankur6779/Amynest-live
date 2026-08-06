/**
 * Child's Room presentation — hope · possibility · patiently waiting.
 * Never empty · never coming soon · never locked.
 * Uses existing guest name only. No new product features.
 */

import type { V2GuestSession } from "@/v2/guest";

export function buildForChildSheetTitle(
  session: Pick<V2GuestSession, "name"> | null | undefined,
): string {
  const name = session?.name?.trim();
  return name ? `For ${name}` : "For your child";
}

/** Soft-save — protect this place, never create-account sales. */
export function buildForChildSheetBody(
  session: Pick<V2GuestSession, "name"> | null | undefined,
): string {
  const name = session?.name?.trim();
  if (name) {
    return `Protect this place for ${name}. Amy is already preparing their next small discovery.`;
  }
  return "Protect this place. Amy is already preparing the next small discovery.";
}

/** Guest whisper — protect, never gate. */
export function buildForChildGuestCta(
  session: Pick<V2GuestSession, "name"> | null | undefined,
): string {
  const name = session?.name?.trim();
  return name ? `Protect ${name}'s place` : "Protect this place";
}

/** Living invitation — discovery, not a task stamp. */
export function buildForChildDiscoverCta(
  session: Pick<V2GuestSession, "name"> | null | undefined,
): string {
  const name = session?.name?.trim();
  return name ? `See what's waiting for ${name}` : "See what's waiting";
}

/**
 * Hope around the living object — expectant, never empty.
 * Child already growing; Amy quietly preparing.
 */
export function buildForChildHope(
  session: Pick<V2GuestSession, "name"> | null | undefined,
): string {
  const name = session?.name?.trim();
  if (name) {
    return `${name} is already growing. Amy is quietly preparing a place for them.`;
  }
  return "Your child is already growing. Amy is quietly preparing a place for them.";
}
