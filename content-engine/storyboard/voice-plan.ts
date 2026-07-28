import type {
  ScenePlan,
  TimelinePlan,
  VoicePlan,
  VoicePlanItem,
} from "../types/storyboard.js";

export function buildVoicePlan(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
): VoicePlan {
  const clipById = new Map(timeline.clips.map((c) => [c.sceneId, c]));
  const items: VoicePlanItem[] = [];

  for (const scene of scenes) {
    const clip = clipById.get(scene.sceneId);
    if (!clip) continue;
    const pad = Math.min(0.15, clip.duration * 0.08);
    const start = round2(clip.sceneStart + pad);
    const end = round2(Math.max(start + 0.4, clip.sceneEnd - pad));
    items.push({
      sceneId: scene.sceneId,
      start,
      end,
      text: scene.voice,
      emotion: scene.emotion,
      pace: paceFor(scene),
    });
  }

  const totalSpokenSeconds = round2(
    items.reduce((sum, item) => sum + (item.end - item.start), 0),
  );

  return { items, totalSpokenSeconds };
}

function paceFor(scene: ScenePlan): VoicePlanItem["pace"] {
  if (scene.purpose === "hook") return "brisk";
  if (scene.purpose === "cta" || scene.purpose === "brand-end") return "moderate";
  if (scene.emotion === "calm") return "slow";
  return "moderate";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
