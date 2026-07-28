import type {
  ScenePlan,
  TimelinePlan,
  TransitionCurve,
  TransitionDirection,
  TransitionPlanItem,
  TransitionType,
} from "../types/storyboard.js";

export function buildTransitionPlan(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
  defaultTransitions: readonly TransitionType[],
): { scenes: ScenePlan[]; transitionPlan: TransitionPlanItem[] } {
  const pool =
    defaultTransitions.length > 0
      ? defaultTransitions
      : (["Cut", "Fade", "Crossfade"] as TransitionType[]);
  const clipById = new Map(timeline.clips.map((c) => [c.sceneId, c]));
  const transitionPlan: TransitionPlanItem[] = [];

  const updated = scenes.map((scene, index) => {
    if (index === 0) {
      return { ...scene, transition: "Fade" as TransitionType };
    }
    const type = pool[(index - 1) % pool.length]!;
    const prev = scenes[index - 1]!;
    const clip = clipById.get(scene.sceneId);
    const at = clip?.sceneStart ?? 0;
    const duration = durationFor(type);
    transitionPlan.push({
      fromSceneId: prev.sceneId,
      toSceneId: scene.sceneId,
      type,
      duration,
      curve: curveFor(type),
      direction: directionFor(type, index),
      at,
    });
    return { ...scene, transition: type };
  });

  return { scenes: updated, transitionPlan };
}

function durationFor(type: TransitionType): number {
  switch (type) {
    case "Cut":
      return 0;
    case "Fade":
      return 0.25;
    case "Crossfade":
      return 0.35;
    case "Slide":
      return 0.3;
    case "Zoom":
      return 0.4;
    case "Dissolve":
      return 0.45;
    default:
      return 0.25;
  }
}

function curveFor(type: TransitionType): TransitionCurve {
  if (type === "Cut") return "linear";
  if (type === "Zoom" || type === "Slide") return "ease-in-out";
  return "ease-out";
}

function directionFor(type: TransitionType, index: number): TransitionDirection {
  if (type === "Slide") return index % 2 === 0 ? "left" : "right";
  if (type === "Zoom") return index % 2 === 0 ? "in" : "out";
  return "none";
}
