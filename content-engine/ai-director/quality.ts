/**
 * Director quality gate — accept only cinematic scenes.
 * Reject PowerPoint / slideshow / static / talking-head / generic AI feel.
 */

import type {
  DirectedScenePlan,
  DirectorQualityResult,
  VisualContinuityBible,
} from "./types.js";
import { findContinuityBreaks } from "./continuity.js";

const ANTI_PATTERNS: Array<{
  code: DirectorQualityResult["rejects"][number]["code"];
  test: (scene: DirectedScenePlan, all: DirectedScenePlan[]) => string | null;
}> = [
  {
    code: "powerpoint",
    test: (scene) => {
      if (scene.role === "feature" || scene.role === "end-card") return null;
      const text = `${scene.objective} ${scene.camera.subjectFraming}`.toLowerCase();
      if (/\b(slide|bullet|powerpoint|deck)\b/.test(text)) {
        return "Scene reads like a PowerPoint slide";
      }
      return null;
    },
  },
  {
    code: "slideshow",
    test: (scene) => {
      if (scene.role === "end-card") return null;
      if (
        scene.camera.movement === "static-hold" &&
        scene.microActions.length < 1 &&
        scene.pacing === "settle"
      ) {
        return "Static settle without life — slideshow energy";
      }
      return null;
    },
  },
  {
    code: "static-image",
    test: (scene) => {
      if (scene.role === "end-card") return null;
      if (scene.microActions.length === 0) {
        return "No micro-actions — will feel like a static image";
      }
      return null;
    },
  },
  {
    code: "talking-head",
    test: (scene) => {
      if (scene.role === "end-card" || scene.role === "cta" || scene.role === "emotion") {
        return null;
      }
      const hasEnvLife = scene.microActions.some(
        (a) =>
          /pencil|notebook|curtain|sunlight|progress|orb|hair|clock|prop|hand|shoulder|window/i.test(
            a,
          ),
      );
      if (
        (scene.camera.shotSize === "close-up" ||
          scene.camera.shotSize === "extreme-close-up") &&
        scene.camera.movement === "static-hold" &&
        !hasEnvLife
      ) {
        return "Talking-head risk — add environmental life or prop action";
      }
      return null;
    },
  },
  {
    code: "generic-ai",
    test: (scene) => {
      if (!scene.camera.shotType || !scene.emotion.targetEmotion) {
        return "Missing directed shot/emotion — would fall back to generic AI";
      }
      if (scene.emotion.intensity < 1 || scene.emotion.intensity > 10) {
        return "Emotion intensity out of range";
      }
      return null;
    },
  },
  {
    code: "missing-micro-action",
    test: (scene) => {
      if (scene.role === "end-card") return null;
      if (scene.microActions.length < 1) {
        return "Director requires at least one micro-action per living scene";
      }
      return null;
    },
  },
];

export function gateDirectorPackage(input: {
  scenes: DirectedScenePlan[];
  continuity: VisualContinuityBible;
}): DirectorQualityResult {
  const rejects: DirectorQualityResult["rejects"] = [];

  for (const scene of input.scenes) {
    for (const rule of ANTI_PATTERNS) {
      const reason = rule.test(scene, input.scenes);
      if (reason) {
        rejects.push({ sceneId: scene.sceneId, reason, code: rule.code });
      }
    }
  }

  for (const br of findContinuityBreaks(input.scenes, input.continuity)) {
    rejects.push({
      sceneId: br.sceneId,
      reason: br.reason,
      code: "continuity-break",
    });
  }

  // Diversity: too many identical shot types in a row feels like a slideshow.
  for (let i = 1; i < input.scenes.length; i++) {
    const prev = input.scenes[i - 1]!;
    const cur = input.scenes[i]!;
    if (
      prev.role !== "end-card" &&
      cur.role !== "end-card" &&
      prev.camera.shotType === cur.camera.shotType &&
      prev.camera.movement === cur.camera.movement &&
      prev.role !== cur.role
    ) {
      rejects.push({
        sceneId: cur.sceneId,
        reason: `Repeated ${cur.camera.shotType} + ${cur.camera.movement} across roles — vary the shot language`,
        code: "slideshow",
      });
    }
  }

  const living = input.scenes.filter((s) => s.role !== "end-card");
  const directedCount = living.filter(
    (s) => s.microActions.length > 0 && s.camera.shotType && s.emotion.intensity >= 4,
  ).length;
  const cinematicScore =
    living.length === 0
      ? 100
      : Math.round((directedCount / living.length) * 100) -
        Math.min(40, rejects.length * 8);

  const ok = rejects.length === 0 && cinematicScore >= 70;
  return {
    ok,
    cinematicScore: Math.max(0, Math.min(100, cinematicScore)),
    rejects,
    summary: ok
      ? `Cinematic director package accepted (score ${Math.max(0, cinematicScore)}).`
      : `Director rejected non-cinematic beats: ${rejects.map((r) => r.code).join(", ")}`,
  };
}
