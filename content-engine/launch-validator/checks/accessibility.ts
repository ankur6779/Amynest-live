/**
 * Accessibility package checks are DISABLED for certification.
 * Subtitle readability requires OCR of burned-in captions on the final MP4.
 */

import type { LaunchCheck, LaunchValidationInput } from "../types.js";

/** @deprecated Hardcoded contrast PASS and caption-array trust removed. */
export function validateAccessibility(
  _input: LaunchValidationInput,
): LaunchCheck[] {
  return [
    {
      id: "a11y.legacy-blocked",
      category: "accessibility",
      ok: false,
      status: "FAIL",
      severity: "critical",
      code: "A11Y_METADATA_REMOVED",
      message:
        "Caption-array / hardcoded contrast checks removed — OCR burned-in subtitles on MP4",
      suggestion: "Burn high-contrast captions and re-run evidence certification.",
    },
  ];
}
