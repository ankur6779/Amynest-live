/**
 * Character Memory quality gate — advisory continuity rejects (not launch validators).
 */

import { wardrobeFor } from "./wardrobe.js";
import type {
  ContinuityScores,
  MemoryRejectCode,
  SceneCharacterMemory,
} from "./types.js";

const EMOTION_ORDER = [
  "Curious",
  "Thinking",
  "Understanding",
  "Success",
  "Celebration",
];

export function gateSceneMemory(
  scene: SceneCharacterMemory,
  previous: SceneCharacterMemory | null,
): SceneCharacterMemory {
  if (scene.role === "end-card" || !previous || previous.role === "end-card") {
    return { ...scene, ok: true, rejects: [] };
  }

  const rejects: SceneCharacterMemory["rejects"] = [];
  const intentional = new Set(scene.intentionalChanges);

  // Identity / wardrobe
  for (const pose of scene.poses) {
    const locked = wardrobeFor(pose.character);
    if (
      pose.clothing !== locked.clothing ||
      pose.hairstyle !== locked.hairstyle ||
      pose.accessories !== locked.accessories
    ) {
      rejects.push({
        code: "wardrobe-changed",
        reason: `${pose.character} wardrobe drifted from Character Bible`,
      });
    }
    const prevPose = previous.poses.find((p) => p.character === pose.character);
    if (prevPose && !intentional.has("pose") && !intentional.has("seed")) {
      if (
        normalize(prevPose.clothing) !== normalize(pose.clothing) ||
        normalize(prevPose.hairstyle) !== normalize(pose.hairstyle)
      ) {
        rejects.push({
          code: "identity-drift",
          reason: `${pose.character} identity changed vs previous approved scene`,
        });
      }
    }
  }

  // Props
  if (!intentional.has("props") && previous.props.length > 0) {
    for (const prop of previous.props) {
      const still = scene.props.find((p) => p.id === prop.id);
      if (!still) {
        rejects.push({
          code: "prop-disappeared",
          reason: `Prop "${prop.description}" disappeared without story change`,
        });
      }
    }
  }

  // Lighting
  if (!intentional.has("lighting")) {
    if (
      previous.lighting.timeOfDay !== scene.lighting.timeOfDay ||
      previous.lighting.windowDirection !== scene.lighting.windowDirection
    ) {
      rejects.push({
        code: "lighting-changed",
        reason: "Lighting / window direction reset without story change",
      });
    }
  }

  // Room / background
  if (!intentional.has("room") && normalize(previous.room) !== normalize(scene.room)) {
    rejects.push({
      code: "background-changed",
      reason: "Room/background changed without intentional story beat",
    });
  }

  // Camera teleport
  if (!intentional.has("camera")) {
    if (
      /teleport|hard cut reset|new establishing with no match/i.test(
        scene.camera.framingNote,
      )
    ) {
      rejects.push({
        code: "camera-reset",
        reason: "Camera framing teleports instead of continuing momentum",
      });
    }
    if (
      previous.camera.continueFrom &&
      !scene.inheritsFromSceneId
    ) {
      rejects.push({
        code: "camera-reset",
        reason: "Missing inherit link from previous camera end frame",
      });
    }
  }

  // Emotion jump
  if (!intentional.has("emotion")) {
    const prevIdx = EMOTION_ORDER.indexOf(previous.emotion.stage);
    const nextIdx = EMOTION_ORDER.indexOf(scene.emotion.stage);
    if (prevIdx >= 0 && nextIdx >= 0 && nextIdx - prevIdx > 1) {
      rejects.push({
        code: "emotion-jump",
        reason: `Emotion jumped ${previous.emotion.stage} → ${scene.emotion.stage}`,
      });
    }
    if (prevIdx >= 0 && nextIdx >= 0 && nextIdx < prevIdx) {
      rejects.push({
        code: "emotion-jump",
        reason: `Emotion regresses ${previous.emotion.stage} → ${scene.emotion.stage}`,
      });
    }
  }

  // Pose hard reset
  if (!intentional.has("pose") && !intentional.has("seed")) {
    for (const pose of scene.poses) {
      const prevPose = previous.poses.find((p) => p.character === pose.character);
      if (
        prevPose &&
        normalize(prevPose.position) !== normalize(pose.position) &&
        /opposite side|teleport|reset to/i.test(pose.position)
      ) {
        rejects.push({
          code: "pose-reset",
          reason: `${pose.character} pose teleported without story motivation`,
        });
      }
    }
  }

  return {
    ...scene,
    ok: rejects.length === 0,
    rejects,
  };
}

export function scoreMemoryContinuity(scenes: SceneCharacterMemory[]): {
  scores: ContinuityScores;
  rejects: Array<{ sceneId: string; code: MemoryRejectCode; reason: string }>;
  ok: boolean;
  summary: string;
} {
  const living = scenes.filter((s) => s.role !== "end-card");
  const rejects = living.flatMap((s) =>
    s.rejects.map((r) => ({ sceneId: s.sceneId, code: r.code, reason: r.reason })),
  );

  if (living.length <= 1) {
    const scores: ContinuityScores = {
      characterIdentity: 100,
      sceneContinuity: 100,
      emotionContinuity: 100,
      cameraContinuity: 100,
    };
    return {
      scores,
      rejects,
      ok: rejects.length === 0,
      summary:
        rejects.length === 0
          ? "Character Memory accepted — single-scene seed (100% continuity)."
          : `Character Memory rejects: ${rejects.map((r) => r.code).join(", ")}`,
    };
  }

  const pairs = living.length - 1;
  let identityOk = 0;
  let sceneOk = 0;
  let emotionOk = 0;
  let cameraOk = 0;

  for (let i = 1; i < living.length; i++) {
    const cur = living[i]!;
    const codes = new Set(cur.rejects.map((r) => r.code));
    if (!codes.has("identity-drift") && !codes.has("wardrobe-changed")) identityOk++;
    if (
      !codes.has("background-changed") &&
      !codes.has("prop-disappeared") &&
      !codes.has("lighting-changed") &&
      !codes.has("pose-reset")
    ) {
      sceneOk++;
    }
    if (!codes.has("emotion-jump")) emotionOk++;
    if (!codes.has("camera-reset")) cameraOk++;
  }

  const scores: ContinuityScores = {
    characterIdentity: Math.round((identityOk / pairs) * 100),
    sceneContinuity: Math.round((sceneOk / pairs) * 100),
    emotionContinuity: Math.round((emotionOk / pairs) * 100),
    cameraContinuity: Math.round((cameraOk / pairs) * 100),
  };

  const ok =
    rejects.length === 0 &&
    scores.characterIdentity >= 95 &&
    scores.sceneContinuity >= 95;

  return {
    scores,
    rejects,
    ok,
    summary: ok
      ? `Character Memory accepted — identity ${scores.characterIdentity}% · scene ${scores.sceneContinuity}% · emotion ${scores.emotionContinuity}% · camera ${scores.cameraContinuity}%.`
      : `Character Memory rejects: ${rejects.map((r) => r.code).join(", ") || "score below target"}`,
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
