/**
 * Timeline Composer — assemble validated scenes into a seamless Short timeline.
 */

import type { ComposerSceneIntent, ComposerTransition } from "./types.js";
import { sceneIdFor } from "./prompts.js";
import type { SupportedDuration } from "../types/storyboard.js";

export function buildComposerTimeline(
  intents: ComposerSceneIntent[],
  totalDuration: SupportedDuration,
): {
  clips: Array<{ sceneId: string; start: number; end: number; duration: number }>;
  totalSeconds: number;
  transitions: ComposerTransition[];
} {
  let cursor = 0;
  const clips = intents.map((intent, index) => {
    const sceneId = sceneIdFor(intent, index);
    const start = round2(cursor);
    const duration = intent.durationSeconds;
    const end = round2(start + duration);
    cursor = end;
    return { sceneId, start, end, duration };
  });

  // Normalize exact total
  const last = clips[clips.length - 1];
  if (last) {
    last.end = totalDuration;
    last.duration = round2(last.end - last.start);
  }

  const transitions: ComposerTransition[] = [];
  for (let i = 0; i < clips.length - 1; i++) {
    const from = clips[i]!;
    const to = clips[i + 1]!;
    const toIntent = intents[i + 1]!;
    const brandPurpleWash =
      toIntent.role === "feature" ||
      toIntent.role === "cta" ||
      toIntent.role === "end-card";
    transitions.push({
      fromSceneId: from.sceneId,
      toSceneId: to.sceneId,
      type: brandPurpleWash ? "Dissolve" : i % 2 === 0 ? "Crossfade" : "Fade",
      durationSeconds: brandPurpleWash ? 0.45 : 0.35,
      brandPurpleWash,
    });
  }

  return { clips, totalSeconds: totalDuration, transitions };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
