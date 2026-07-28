import type {
  ScenePlan,
  SupportedDuration,
  TimelineClip,
  TimelinePlan,
} from "../types/storyboard.js";
import { SUPPORTED_DURATIONS } from "../types/storyboard.js";

/** Snap estimated duration to supported 15 / 20 / 30 second budgets. */
export function resolveSupportedDuration(rawSeconds: number): SupportedDuration {
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) return 30;
  let best: SupportedDuration = SUPPORTED_DURATIONS[0]!;
  let bestDelta = Math.abs(rawSeconds - best);
  for (const candidate of SUPPORTED_DURATIONS) {
    const delta = Math.abs(rawSeconds - candidate);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

/**
 * Allocate contiguous non-overlapping clips that fill the timeline exactly.
 * Weights come from scene priority × base purpose weight.
 */
export function buildTimeline(
  scenes: readonly ScenePlan[],
  totalDuration: SupportedDuration,
): TimelinePlan {
  if (scenes.length === 0) {
    throw new Error("Cannot build timeline without scenes");
  }

  const weights = scenes.map((scene) => Math.max(1, scene.priority) * purposeWeight(scene.purpose));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const clips: TimelineClip[] = [];
  let cursor = 0;

  scenes.forEach((scene, index) => {
    const isLast = index === scenes.length - 1;
    const share = weights[index]! / weightSum;
    const rawDuration = isLast
      ? round2(totalDuration - cursor)
      : round2(Math.max(1.2, totalDuration * share));
    const sceneStart = round2(cursor);
    let sceneEnd = round2(sceneStart + rawDuration);
    if (isLast) sceneEnd = totalDuration;
    if (sceneEnd <= sceneStart) sceneEnd = round2(sceneStart + 0.5);

    clips.push({
      sceneId: scene.sceneId,
      sceneStart,
      sceneEnd,
      duration: round2(sceneEnd - sceneStart),
    });
    cursor = sceneEnd;
  });

  // Hard-normalize last end and redistribute tiny float drift.
  const last = clips[clips.length - 1]!;
  last.sceneEnd = totalDuration;
  last.duration = round2(last.sceneEnd - last.sceneStart);

  return { totalDuration, clips };
}

/** Apply timeline clip durations back onto scene plans (immutable copy). */
export function applyTimelineDurations(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
): ScenePlan[] {
  const byId = new Map(timeline.clips.map((c) => [c.sceneId, c]));
  return scenes.map((scene) => {
    const clip = byId.get(scene.sceneId);
    if (!clip) return { ...scene };
    return { ...scene, duration: clip.duration };
  });
}

export function assertTimelineIntegrity(timeline: TimelinePlan): string[] {
  const issues: string[] = [];
  if (timeline.clips.length === 0) {
    issues.push("timeline has no clips");
    return issues;
  }

  let cursor = 0;
  for (let i = 0; i < timeline.clips.length; i++) {
    const clip = timeline.clips[i]!;
    if (Math.abs(clip.sceneStart - cursor) > 0.01) {
      issues.push(
        `gap or overlap before ${clip.sceneId}: expected start ${cursor}, got ${clip.sceneStart}`,
      );
    }
    if (clip.sceneEnd <= clip.sceneStart) {
      issues.push(`${clip.sceneId} has non-positive duration`);
    }
    if (Math.abs(clip.duration - (clip.sceneEnd - clip.sceneStart)) > 0.01) {
      issues.push(`${clip.sceneId} duration mismatch`);
    }
    cursor = clip.sceneEnd;
  }

  if (Math.abs(cursor - timeline.totalDuration) > 0.01) {
    issues.push(
      `timeline ends at ${cursor}, expected ${timeline.totalDuration}`,
    );
  }

  return issues;
}

function purposeWeight(purpose: ScenePlan["purpose"]): number {
  switch (purpose) {
    case "hook":
      return 1.1;
    case "opening-question":
      return 1;
    case "story":
      return 1.3;
    case "key-point":
      return 1.2;
    case "cta":
      return 1.15;
    case "brand-end":
      return 0.9;
    default:
      return 1;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
