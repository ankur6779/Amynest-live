/**
 * Story text-only checks are DISABLED for certification.
 * Story must be verified on the final MP4 (OCR + muted test).
 */

import type { ContentPackage } from "../../types/content-package.js";
import type { LaunchCheck } from "../types.js";

/** @deprecated Text-only story validation cannot certify a Short. */
export function validateStory(_content: ContentPackage): LaunchCheck[] {
  return [
    {
      id: "story.legacy-text-blocked",
      category: "story",
      ok: false,
      status: "FAIL",
      severity: "critical",
      code: "STORY_TEXT_ONLY_REMOVED",
      message:
        "Text-only story validation removed — story/muted gates require final MP4 evidence",
      suggestion:
        "Ensure burned-in captions tell beginning→conflict→resolution→CTA without audio.",
    },
  ];
}
