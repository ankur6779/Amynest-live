/**
 * Brand package/signal checks are DISABLED for certification.
 * End card / badges / icon must be detected on the final MP4.
 */

import type { LaunchCheck, LaunchValidationInput } from "../types.js";

/** @deprecated mediaSignals endCardPresent/storeBadgesPresent removed (were fail-open). */
export function validateBrand(_input: LaunchValidationInput): LaunchCheck[] {
  return [
    {
      id: "brand.legacy-signals-blocked",
      category: "brand",
      ok: false,
      status: "FAIL",
      severity: "critical",
      code: "BRAND_SIGNALS_REMOVED",
      message:
        "Fail-open brand mediaSignals removed — end card/badges/icon require visual evidence",
      suggestion:
        "Composite official end card with app icon + Google Play + App Store badges + CTA.",
    },
  ];
}
