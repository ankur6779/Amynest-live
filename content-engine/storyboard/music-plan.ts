import type { ContentEngineConfig } from "../types/index.js";
import type { MusicPlan, SupportedDuration } from "../types/storyboard.js";

export function buildMusicPlan(
  config: ContentEngineConfig,
  totalDuration: SupportedDuration,
): MusicPlan {
  const enabled = config.music.enabled;
  const introEnd = Math.min(3, totalDuration * 0.15);
  const outroStart = Math.max(introEnd + 1, totalDuration - Math.min(4, totalDuration * 0.2));

  return {
    enabled,
    defaultTrackId: config.music.defaultTrackId,
    duckingLevel: 0.55,
    segments: enabled
      ? [
          {
            id: "music-intro",
            role: "intro",
            start: 0,
            end: round2(introEnd),
            energy: 0.35,
            mood: "soft-open",
            ducking: true,
            trackHint: config.music.defaultTrackId,
          },
          {
            id: "music-main",
            role: "main",
            start: round2(introEnd),
            end: round2(outroStart),
            energy: 0.5,
            mood: "warm-supportive",
            ducking: true,
            trackHint: config.music.defaultTrackId,
          },
          {
            id: "music-outro",
            role: "outro",
            start: round2(outroStart),
            end: totalDuration,
            energy: 0.4,
            mood: "hopeful-resolve",
            ducking: false,
            trackHint: config.music.defaultTrackId,
          },
        ]
      : [],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
