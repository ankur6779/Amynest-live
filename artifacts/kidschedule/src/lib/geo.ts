/**
 * Geo-detection helpers — browser-side, synchronous, no API calls needed.
 *
 * We use Intl.DateTimeFormat().resolvedOptions().timeZone (device timezone) as
 * the signal rather than `navigator.language` because:
 *   - Timezone reflects the device's physical location, not just UI language.
 *   - A user in the UK who has set Hindi as their display language would still
 *     have timezone "Europe/London", so Razorpay (India-only gateway) would
 *     correctly stay hidden.
 *   - It is synchronous, always available in modern browsers, requires no
 *     permissions, and cannot be easily spoofed by language settings.
 *
 * India timezones: "Asia/Kolkata" (current IANA canonical) and the legacy
 * alias "Asia/Calcutta" that older systems may still report.
 */

const INDIA_TIMEZONES = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/**
 * Returns true when the user's browser/device timezone is in India.
 * Use this to gate India-only payment methods like Razorpay.
 */
export function isIndiaRegion(): boolean {
  try {
    return INDIA_TIMEZONES.has(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  } catch {
    // Intl not available (very old browser) — default to false (safe for
    // international, India users can contact support).
    return false;
  }
}
