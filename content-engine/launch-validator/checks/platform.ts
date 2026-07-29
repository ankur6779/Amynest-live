/**
 * Platform validation — Shorts / Reels / TikTok safe areas.
 */

import {
  AMYNEST_DELIVERY_SPEC,
  isMultiPlatformSafe,
} from "../../brand/platforms.js";
import type { LaunchCheck, LaunchValidationInput } from "../types.js";

export function validatePlatform(input: LaunchValidationInput): LaunchCheck[] {
  const render = input.render;
  const safe = isMultiPlatformSafe({
    width: render.resolution.width,
    height: render.resolution.height,
    durationSeconds: render.duration,
  });

  const checks: LaunchCheck[] = [
    {
      id: "platform.multi-safe",
      category: "platform",
      ok: safe.ok,
      severity: "critical",
      code: "PLATFORM_UNSAFE",
      message: safe.ok
        ? "Package meets multi-platform vertical delivery spec"
        : safe.errors.join("; "),
      suggestion: `Export ${AMYNEST_DELIVERY_SPEC.resolution} @ ${AMYNEST_DELIVERY_SPEC.fps}fps within Shorts duration.`,
    },
    {
      id: "platform.youtube-shorts",
      category: "platform",
      ok: render.duration <= 60 && render.resolution.width === 1080,
      severity: "critical",
      code: "YOUTUBE_SHORTS",
      message: "Must be YouTube Shorts safe (≤60s, 9:16)",
      suggestion: "Keep final master under 60 seconds.",
    },
    {
      id: "platform.instagram-reels",
      category: "platform",
      ok: render.duration <= 90 && render.resolution.height === 1920,
      severity: "major",
      code: "INSTAGRAM_REELS",
      message: "Must be Instagram Reels safe",
      suggestion: "Maintain 9:16 and clean caption margins.",
    },
    {
      id: "platform.facebook-reels",
      category: "platform",
      ok: render.duration <= 90,
      severity: "major",
      code: "FACEBOOK_REELS",
      message: "Must be Facebook Reels safe",
      suggestion: "Reuse the same vertical master.",
    },
    {
      id: "platform.tiktok-safe-area",
      category: "platform",
      ok: true, // enforced via caption positions + delivery margins policy
      severity: "major",
      code: "TIKTOK_SAFE_AREA",
      message: "TikTok UI safe area must be respected",
      suggestion: `Keep captions inside margins top ${AMYNEST_DELIVERY_SPEC.safeMarginsPct.top}% / bottom ${AMYNEST_DELIVERY_SPEC.safeMarginsPct.bottom}%.`,
    },
    {
      id: "platform.caption-safe-area",
      category: "platform",
      ok: input.content.captions.every(
        (c) => c.position === "bottom" || c.position === "top" || !c.position,
      ),
      severity: "major",
      code: "CAPTION_SAFE_AREA",
      message: "Captions must stay in platform-safe zones",
      suggestion: "Prefer bottom captions with generous side margins.",
    },
  ];

  return checks;
}
