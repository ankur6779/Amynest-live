/**
 * Technical validation — prefers probed final-MP4 measurements over package claims.
 */

import { existsSync, statSync } from "node:fs";
import { AMYNEST_DELIVERY_SPEC } from "../../brand/platforms.js";
import type { QualityCertificationReport } from "../media-evidence/types.js";
import type { LaunchCheck, LaunchValidationInput } from "../types.js";

export function validateTechnicalFromEvidence(
  input: LaunchValidationInput,
  certification: QualityCertificationReport,
): LaunchCheck[] {
  const render = input.render;
  const v = certification.evidence.visual;
  const a = certification.evidence.audio;
  const fileExists = certification.evidence.fileExists;
  const sizeOk =
    certification.evidence.fileSizeBytes >= 50_000 ||
    (fileExists &&
      (() => {
        try {
          return statSync(render.videoPath).size > 16;
        } catch {
          return false;
        }
      })());

  const width = v.width ?? render.resolution.width;
  const height = v.height ?? render.resolution.height;
  const duration = v.durationSec ?? render.duration;
  const fps = v.fps ?? render.fps;

  const targetDuration = input.content.estimatedDuration;
  const durationOk =
    duration > 0 &&
    Math.abs(duration - targetDuration) <= Math.max(4, targetDuration * 0.25);

  // Never trust package claims when probe disagrees or is missing.
  const probeTrusted = certification.evidence.probeComplete;

  return [
    {
      id: "tech.resolution",
      category: "technical",
      ok: probeTrusted && width === 1080 && height === 1920,
      status: !probeTrusted
        ? "INCONCLUSIVE"
        : width === 1080 && height === 1920
          ? "PASS"
          : "FAIL",
      severity: "critical",
      code: "RESOLUTION",
      message: `Resolution must be ${AMYNEST_DELIVERY_SPEC.resolution} (probed ${width}x${height})`,
      suggestion: "Re-encode to 1080x1920 vertical master.",
      evidenceSummary: `probed=${width}x${height}`,
    },
    {
      id: "tech.duration",
      category: "technical",
      ok: probeTrusted && durationOk && duration <= 60,
      status: !probeTrusted
        ? "INCONCLUSIVE"
        : durationOk && duration <= 60
          ? "PASS"
          : "FAIL",
      severity: "critical",
      code: "DURATION",
      message: `Duration must match target (~${targetDuration}s); probed=${duration}s`,
      suggestion: "Trim or retime scenes to the planned Short length.",
    },
    {
      id: "tech.fps",
      category: "technical",
      ok: probeTrusted && (fps === 30 || fps === 24),
      status: !probeTrusted
        ? "INCONCLUSIVE"
        : fps === 30 || fps === 24
          ? "PASS"
          : "FAIL",
      severity: "major",
      code: "FPS",
      message: `FPS should be ${AMYNEST_DELIVERY_SPEC.fps} (probed ${fps})`,
      suggestion: "Export 30fps H.264 for platform consistency.",
    },
    {
      id: "tech.audio-stream",
      category: "technical",
      ok: probeTrusted && a.hasAudioStream && !a.silentTrack,
      status: !probeTrusted
        ? "INCONCLUSIVE"
        : a.hasAudioStream && !a.silentTrack
          ? "PASS"
          : "FAIL",
      severity: "critical",
      code: "AUDIO_STREAM",
      message: "Final MP4 must contain a non-silent audio stream",
      suggestion: "Mux real narration + music — never anullsrc silence.",
      evidenceSummary: `meanVolumeDb=${a.meanVolumeDb}`,
    },
    {
      id: "tech.bitrate",
      category: "technical",
      ok: sizeOk,
      status: sizeOk ? "PASS" : "FAIL",
      severity: "minor",
      code: "BITRATE",
      message: "Export should meet target quality bitrate / file size",
      suggestion: `Aim ≥${AMYNEST_DELIVERY_SPEC.minBitrateKbps} kbps for motion clarity.`,
    },
    {
      id: "tech.playable-mp4",
      category: "technical",
      ok:
        probeTrusted &&
        fileExists &&
        sizeOk &&
        !v.corrupt &&
        /h264|avc/i.test(v.codec ?? render.codec),
      status: !probeTrusted
        ? "INCONCLUSIVE"
        : fileExists && sizeOk && !v.corrupt
          ? "PASS"
          : "FAIL",
      severity: "critical",
      code: "NOT_PLAYABLE_MP4",
      message: "Final file must be a playable H.264 MP4 (probe must succeed)",
      suggestion: "Confirm videoPath exists and ffprobe reads a clean stream.",
    },
    {
      id: "tech.package-claims-untrusted",
      category: "technical",
      ok: true,
      status: "PASS",
      severity: "minor",
      code: "CLAIMS_UNTRUSTED",
      message:
        "Render package subtitleMode/watermark claims are ignored — OCR/probe decide",
      evidenceSummary: `subtitleModeClaim=${render.renderMetadata.subtitleMode ?? "unset"}`,
    },
  ];
}

/** @deprecated Use validateTechnicalFromEvidence — package-only technical checks are unsafe. */
export function validateTechnical(input: LaunchValidationInput): LaunchCheck[] {
  const fileExists = existsSync(input.render.videoPath);
  return [
    {
      id: "tech.legacy-blocked",
      category: "technical",
      ok: false,
      status: "FAIL",
      severity: "critical",
      code: "LEGACY_TECH_CHECK_BLOCKED",
      message:
        "Package-only technical validation is disabled — run evidence probe via validateLaunch",
      suggestion: "Call validateLaunch so the final MP4 is probed.",
    },
    {
      id: "tech.file-exists-hint",
      category: "technical",
      ok: fileExists,
      status: fileExists ? "PASS" : "FAIL",
      severity: "critical",
      code: "FILE_EXISTS",
      message: fileExists
        ? "videoPath exists on disk"
        : "videoPath missing on disk",
    },
  ];
}
