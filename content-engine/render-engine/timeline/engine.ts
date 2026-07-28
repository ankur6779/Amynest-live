import { assertTimelineIntegrity } from "../../timeline/index.js";
import type { StoryboardPackage } from "../../types/storyboard.js";
import type { FrameTimeline, FrameTimelineClip, TransitionSpec } from "../../types/render-package.js";

/** Convert storyboard seconds timeline into frame-accurate render timeline. */
export function buildFrameTimeline(
  storyboard: StoryboardPackage,
  fps: number,
): FrameTimeline {
  const integrity = assertTimelineIntegrity(storyboard.timeline);
  if (integrity.length > 0) {
    throw new Error(`Invalid storyboard timeline: ${integrity.join("; ")}`);
  }

  const clips: FrameTimelineClip[] = storyboard.timeline.clips.map((clip) => {
    const startFrame = Math.round(clip.sceneStart * fps);
    const endFrame = Math.round(clip.sceneEnd * fps);
    return {
      sceneId: clip.sceneId,
      startFrame,
      endFrame,
      startSeconds: clip.sceneStart,
      endSeconds: clip.sceneEnd,
      durationFrames: Math.max(1, endFrame - startFrame),
      durationSeconds: clip.duration,
    };
  });

  validateNoGapsOrOverlaps(clips, fps);

  const totalFrames = clips.length ? clips[clips.length - 1]!.endFrame : 0;
  return {
    fps,
    totalFrames,
    totalSeconds: totalFrames / fps,
    clips,
  };
}

export function buildTransitionSpecs(
  storyboard: StoryboardPackage,
  timeline: FrameTimeline,
): TransitionSpec[] {
  return storyboard.transitionPlan.map((t) => {
    const atFrame = Math.round(t.at * timeline.fps);
    const durationFrames = Math.max(0, Math.round(t.duration * timeline.fps));
    return {
      fromSceneId: t.fromSceneId,
      toSceneId: t.toSceneId,
      type: t.type,
      durationSeconds: t.duration,
      atFrame,
      durationFrames,
    };
  });
}

function validateNoGapsOrOverlaps(clips: FrameTimelineClip[], fps: number): void {
  let cursor = 0;
  for (const clip of clips) {
    if (clip.startFrame !== cursor) {
      throw new Error(
        `Frame timeline gap/overlap at ${clip.sceneId}: expected ${cursor}, got ${clip.startFrame} @${fps}fps`,
      );
    }
    if (clip.endFrame <= clip.startFrame) {
      throw new Error(`Non-positive frame duration for ${clip.sceneId}`);
    }
    cursor = clip.endFrame;
  }
}
