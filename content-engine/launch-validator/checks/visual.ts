/**
 * Visual package/signal checks are DISABLED for certification.
 * Real visual gates run via media-evidence probe on the final MP4.
 */

import type { LaunchCheck, LaunchValidationInput } from "../types.js";

/** @deprecated mediaSignals / render.validation trust removed. */
export function validateVisual(_input: LaunchValidationInput): LaunchCheck[] {
  return [
    {
      id: "visual.legacy-signals-blocked",
      category: "visual",
      ok: false,
      status: "FAIL",
      severity: "critical",
      code: "VISUAL_SIGNALS_REMOVED",
      message:
        "mediaSignals / subtitleMode / render.validation trust removed — use evidence visual gates",
      suggestion:
        "Burn subtitles, lock characters to bible sheets, and re-run validateLaunch on the MP4.",
    },
  ];
}
