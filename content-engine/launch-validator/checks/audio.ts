/**
 * Audio package checks are DISABLED for certification.
 * Real audio gates run via media-evidence probe on the final MP4.
 */

import type { LaunchCheck, LaunchValidationInput } from "../types.js";

/** @deprecated mediaSignals path removed — always FAIL to prevent silent bypass. */
export function validateAudio(_input: LaunchValidationInput): LaunchCheck[] {
  return [
    {
      id: "audio.legacy-signals-blocked",
      category: "audio",
      ok: false,
      status: "FAIL",
      severity: "critical",
      code: "AUDIO_SIGNALS_REMOVED",
      message:
        "mediaSignals audio checks removed — certify via final MP4 probe (evidence.audio)",
      suggestion:
        "Do not pass narrationSyncOk/musicBalanced flags. Mix real narration+music and re-validate.",
    },
  ];
}
