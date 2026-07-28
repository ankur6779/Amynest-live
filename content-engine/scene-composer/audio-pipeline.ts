/**
 * Audio pipeline plan — narration sync, subtitles, music ducking, subtle SFX.
 */

import type { ComposerAudioPlan, ComposerSceneIntent } from "./types.js";
import { sceneIdFor } from "./prompts.js";

export function buildComposerAudioPlan(
  intents: ComposerSceneIntent[],
): ComposerAudioPlan {
  let cursor = 0;
  const narrationSegments: ComposerAudioPlan["narrationSegments"] = [];
  const subtitleCues: ComposerAudioPlan["subtitleCues"] = [];
  const soundEffects: ComposerAudioPlan["soundEffects"] = [];

  intents.forEach((intent, index) => {
    const sceneId = sceneIdFor(intent, index);
    const start = round2(cursor);
    const end = round2(cursor + intent.durationSeconds);
    narrationSegments.push({
      sceneId,
      start,
      end,
      text: intent.narration,
      emotion: intent.emotion,
    });
    subtitleCues.push({
      sceneId,
      start: round2(start + 0.12),
      end: round2(Math.max(start + 0.4, end - 0.1)),
      text: intent.caption,
    });

    if (intent.role === "hook") {
      soundEffects.push({
        sceneId,
        at: start + 0.15,
        hint: "soft whoosh into cold open",
      });
    }
    if (intent.role === "feature") {
      soundEffects.push({
        sceneId,
        at: start + 0.3,
        hint: "gentle UI chime / purple glow pulse",
      });
    }
    if (intent.role === "end-card") {
      soundEffects.push({
        sceneId,
        at: start + 0.2,
        hint: "soft brand settle chime",
      });
    }
    cursor = end;
  });

  return {
    narrationSegments,
    subtitleCues,
    music: {
      mood: "warm-hopeful-parenting",
      duckingLevel: 0.72,
      bedHint:
        "Soft piano + light pad under narration; swell gently into hope close; never overpower voice",
    },
    soundEffects,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
