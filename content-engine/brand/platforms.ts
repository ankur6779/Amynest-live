/** Multi-platform delivery constraints for every AmyNest Short. */
export const AMYNEST_PLATFORM_TARGETS = Object.freeze({
  youtubeShorts: {
    id: "youtube-shorts",
    aspectRatio: "9:16" as const,
    resolution: "1080x1920" as const,
    maxDurationSeconds: 60,
    preferredDurationSeconds: 15,
    captionSafe: true,
  },
  instagramReels: {
    id: "instagram-reels",
    aspectRatio: "9:16" as const,
    resolution: "1080x1920" as const,
    maxDurationSeconds: 90,
    preferredDurationSeconds: 15,
    captionSafe: true,
  },
  facebookReels: {
    id: "facebook-reels",
    aspectRatio: "9:16" as const,
    resolution: "1080x1920" as const,
    maxDurationSeconds: 90,
    preferredDurationSeconds: 15,
    captionSafe: true,
  },
  tiktok: {
    id: "tiktok",
    aspectRatio: "9:16" as const,
    resolution: "1080x1920" as const,
    maxDurationSeconds: 60,
    preferredDurationSeconds: 15,
    captionSafe: true,
  },
  future: {
    id: "future-vertical",
    aspectRatio: "9:16" as const,
    resolution: "1080x1920" as const,
    maxDurationSeconds: 60,
    preferredDurationSeconds: 15,
    captionSafe: true,
  },
});

export const AMYNEST_DELIVERY_SPEC = Object.freeze({
  aspectRatio: "9:16" as const,
  resolution: "1080x1920" as const,
  fps: 30,
  videoCodec: "h264",
  audioCodec: "aac",
  audioSampleRate: 48_000,
  minBitrateKbps: 4_000,
  captionBurnIn: true,
  safeMarginsPct: { top: 12, bottom: 18, left: 6, right: 6 },
  platforms: Object.values(AMYNEST_PLATFORM_TARGETS).map((p) => p.id),
});

export function isMultiPlatformSafe(meta: {
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (meta.width !== 1080 || meta.height !== 1920) {
    errors.push(`Resolution must be 1080x1920 (got ${meta.width}x${meta.height})`);
  }
  if (meta.durationSeconds != null && meta.durationSeconds > 60) {
    errors.push(`Duration ${meta.durationSeconds}s exceeds Shorts-safe 60s`);
  }
  if (meta.durationSeconds != null && meta.durationSeconds < 5) {
    errors.push(`Duration ${meta.durationSeconds}s too short for platform delivery`);
  }
  return { ok: errors.length === 0, errors };
}
