import type {
  CameraMove,
  CameraPlanItem,
  CameraStyle,
  ScenePlan,
  TimelinePlan,
} from "../types/storyboard.js";

const STYLE_SEQUENCE: Record<CameraStyle, CameraMove[]> = {
  "static-first": ["Hold", "Static", "Zoom In", "Static", "Hold", "Push", "Static"],
  cinematic: ["Push", "Pan Left", "Zoom In", "Hold", "Pan Right", "Pull", "Zoom Out"],
  dynamic: ["Zoom In", "Pan Right", "Tilt", "Push", "Pan Left", "Zoom Out", "Pull"],
};

export function buildCameraPlan(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
  cameraStyle: CameraStyle,
): { scenes: ScenePlan[]; cameraPlan: CameraPlanItem[] } {
  const sequence = STYLE_SEQUENCE[cameraStyle];
  const clipById = new Map(timeline.clips.map((c) => [c.sceneId, c]));
  const cameraPlan: CameraPlanItem[] = [];

  const updated = scenes.map((scene, index) => {
    const move = pickMove(scene, sequence[index % sequence.length]!);
    const clip = clipById.get(scene.sceneId);
    const start = clip?.sceneStart ?? 0;
    const end = clip?.sceneEnd ?? start + scene.duration;
    cameraPlan.push({
      sceneId: scene.sceneId,
      move,
      intensity: intensityFor(move, scene.purpose),
      start,
      end,
    });
    return { ...scene, camera: move };
  });

  return { scenes: updated, cameraPlan };
}

function pickMove(scene: ScenePlan, preferred: CameraMove): CameraMove {
  if (scene.purpose === "brand-end") return "Hold";
  if (scene.purpose === "cta") return preferred === "Static" ? "Zoom In" : preferred;
  if (scene.purpose === "hook") return preferred === "Hold" ? "Push" : preferred;
  return preferred;
}

function intensityFor(move: CameraMove, purpose: ScenePlan["purpose"]): number {
  if (move === "Static" || move === "Hold") return 0.1;
  if (purpose === "cta") return 0.55;
  if (purpose === "hook") return 0.45;
  return 0.35;
}
