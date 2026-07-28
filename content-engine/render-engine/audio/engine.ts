import type { StoryboardPackage } from "../../types/storyboard.js";
import type { AudioMixPlan, AudioTrackSpec } from "../../types/render-package.js";

/** Build narration + music + optional SFX mix plan with ducking and fades. */
export function buildAudioMixPlan(storyboard: StoryboardPackage): AudioMixPlan {
  const tracks: AudioTrackSpec[] = [];

  for (const [index, item] of storyboard.voicePlan.items.entries()) {
    tracks.push({
      id: `narration-${index + 1}`,
      role: "narration",
      path: `voice://scene/${item.sceneId}.wav`,
      startSeconds: item.start,
      endSeconds: item.end,
      volume: item.pace === "brisk" ? 1 : item.pace === "slow" ? 0.92 : 0.96,
      fadeInSeconds: 0.05,
      fadeOutSeconds: 0.08,
      ducking: false,
    });
  }

  if (storyboard.musicPlan.enabled) {
    for (const segment of storyboard.musicPlan.segments) {
      tracks.push({
        id: segment.id,
        role: "music",
        path: `music://${storyboard.musicPlan.defaultTrackId}.mp3`,
        startSeconds: segment.start,
        endSeconds: segment.end,
        volume: segment.energy * (segment.ducking ? 1 - storyboard.musicPlan.duckingLevel : 0.8),
        fadeInSeconds: segment.role === "intro" ? 0.4 : 0.15,
        fadeOutSeconds: segment.role === "outro" ? 0.6 : 0.2,
        ducking: segment.ducking,
      });
    }
  }

  // Soft transition SFX on non-cut transitions
  storyboard.transitionPlan.forEach((transition, index) => {
    if (transition.type === "Cut" || transition.duration <= 0) return;
    tracks.push({
      id: `sfx-transition-${index + 1}`,
      role: "sfx",
      path: "sfx://soft-whoosh.wav",
      startSeconds: Math.max(0, transition.at - transition.duration / 2),
      endSeconds: transition.at + transition.duration / 2,
      volume: 0.18,
      fadeInSeconds: 0.05,
      fadeOutSeconds: 0.1,
      ducking: false,
    });
  });

  return {
    tracks,
    normalize: true,
    masterVolume: 1,
    duckingLevel: storyboard.musicPlan.duckingLevel,
  };
}

export function validateAudioSync(
  plan: AudioMixPlan,
  totalDuration: number,
): string[] {
  const issues: string[] = [];
  for (const track of plan.tracks) {
    if (track.endSeconds <= track.startSeconds) {
      issues.push(`${track.id} has non-positive duration`);
    }
    if (track.endSeconds > totalDuration + 0.05) {
      issues.push(`${track.id} ends after composition duration`);
    }
  }
  return issues;
}
