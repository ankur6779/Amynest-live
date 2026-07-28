import type {
  AnimationKind,
  AnimationLevel,
  AnimationPlanItem,
  OverlayPlanItem,
  ScenePlan,
  TimelinePlan,
} from "../types/storyboard.js";

export function buildAnimationPlan(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
  overlays: readonly OverlayPlanItem[],
  animationLevel: AnimationLevel,
): { scenes: ScenePlan[]; animationPlan: AnimationPlanItem[] } {
  const clipById = new Map(timeline.clips.map((c) => [c.sceneId, c]));
  const animationPlan: AnimationPlanItem[] = [];
  let seq = 1;

  const updated = scenes.map((scene) => {
    const kind = sceneAnimation(scene, animationLevel);
    const clip = clipById.get(scene.sceneId);
    const start = clip?.sceneStart ?? 0;
    const end = clip?.sceneEnd ?? start + scene.duration;
    animationPlan.push({
      id: `anim-${String(seq++).padStart(3, "0")}`,
      sceneId: scene.sceneId,
      target: "scene",
      kind,
      start,
      end: round2(Math.min(end, start + 0.6)),
      easing: "ease-out",
      params: { intensity: animationLevel === "expressive" ? 1 : 0.6 },
    });
    return { ...scene, animation: kind };
  });

  for (const overlay of overlays) {
    animationPlan.push({
      id: `anim-${String(seq++).padStart(3, "0")}`,
      sceneId: overlay.sceneId,
      target: overlay.kind === "Logo" ? "logo" : "overlay",
      kind: overlay.animation,
      start: overlay.start,
      end: round2(Math.min(overlay.end, overlay.start + Math.min(0.8, overlay.duration))),
      easing: overlay.animation === "Bounce" ? "ease-out" : "ease-in-out",
      params: {
        fontSize: overlay.fontSize,
        direction: overlay.animation === "Slide" ? "up" : "none",
      },
    });
  }

  // Caption typewriter hint for hook scenes when expressive.
  if (animationLevel !== "subtle") {
    for (const scene of updated) {
      if (scene.purpose !== "hook" && scene.purpose !== "opening-question") continue;
      const clip = clipById.get(scene.sceneId);
      if (!clip) continue;
      animationPlan.push({
        id: `anim-${String(seq++).padStart(3, "0")}`,
        sceneId: scene.sceneId,
        target: "caption",
        kind: "Typewriter",
        start: clip.sceneStart,
        end: round2(clip.sceneStart + Math.min(1.2, clip.duration * 0.5)),
        easing: "linear",
        params: { charsPerSecond: animationLevel === "expressive" ? 28 : 20 },
      });
    }
  }

  return { scenes: updated, animationPlan };
}

function sceneAnimation(scene: ScenePlan, level: AnimationLevel): AnimationKind {
  if (scene.purpose === "cta") return level === "subtle" ? "Fade" : "Pulse";
  if (scene.purpose === "hook") return level === "expressive" ? "Scale" : "Fade";
  if (scene.purpose === "key-point") return level === "expressive" ? "Bounce" : "Slide";
  if (scene.purpose === "brand-end") return "Float";
  return "Fade";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
