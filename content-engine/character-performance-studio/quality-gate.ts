/**
 * Studio quality gate — prompt-plan rejects (does not modify launch validators).
 */

import type { StudioRejectCode, StudioScenePlan } from "./types.js";

export function gateStudioScene(scene: StudioScenePlan): StudioScenePlan {
  const rejects: StudioScenePlan["rejects"] = [];
  const living = scene.briefs.length > 0;

  if (living) {
    // Solo emotional beats are intentional (~20%). Reject only empty living casts
    // or overcrowded dialogue-style trios outside celebration.
    if (scene.briefs.length > 3) {
      rejects.push({
        code: "no-interaction",
        reason: "More than 3 characters — exceeds scene complexity cap",
      });
    } else if (
      scene.briefs.length >= 3 &&
      !/transformation|celebrat|family|ending/i.test(scene.sceneId)
    ) {
      rejects.push({
        code: "no-interaction",
        reason: "Trio cast reserved for celebration / family / ending only",
      });
    }

    for (const brief of scene.briefs) {
      if (brief.face.length === 0) {
        rejects.push({
          code: "neutral-face",
          reason: `${brief.character} has no face emotion cues`,
        });
      }
      if (!brief.eyeFocus) {
        rejects.push({
          code: "eyes-unfocused",
          reason: `${brief.character} eye focus missing`,
        });
      }
      if (brief.body.length === 0) {
        rejects.push({
          code: "robotic-body",
          reason: `${brief.character} missing body language`,
        });
      }
      if (brief.energyVerbs.length === 0) {
        rejects.push({
          code: "posed",
          reason: `${brief.character} has no energy verbs — risks posed stillness`,
        });
      }
      // Flag only affirmative presenter language (ignore "never a presenter…" guidance).
      if (
        brief.character === "amy-ai" &&
        /\b(as a presenter|like a narrator|hard-selling)\b/i.test(brief.intention) &&
        !/\bnever\b/i.test(brief.intention)
      ) {
        rejects.push({
          code: "narrator-amy",
          reason: "Amy intention reads as presenter/narrator",
        });
      }
    }

    if (
      scene.previousFraming &&
      scene.framing === scene.previousFraming &&
      !/end-card/i.test(scene.sceneId)
    ) {
      rejects.push({
        code: "repeated-framing",
        reason: `Framing ${scene.framing} repeats previous shot`,
      });
    }

    if (!/2–3|2-3/.test(scene.shotDensityNote)) {
      rejects.push({
        code: "static-shot",
        reason: "Missing 2–3s shot density guidance",
      });
    }

    if (!/NO AD MODE|solving/i.test(scene.noAdModeNote)) {
      rejects.push({
        code: "ad-mode",
        reason: "Missing no-ad-mode solve-first note",
      });
    }
  }

  return {
    ...scene,
    ok: rejects.length === 0,
    rejects,
  };
}

export function summarizeStudioQuality(scenes: StudioScenePlan[]): {
  ok: boolean;
  score: number;
  rejects: Array<{ sceneId: string; code: StudioRejectCode; reason: string }>;
  summary: string;
} {
  const rejects = scenes.flatMap((s) =>
    s.rejects.map((r) => ({ sceneId: s.sceneId, code: r.code, reason: r.reason })),
  );
  const living = scenes.filter((s) => s.briefs.length > 0);
  const passed = living.filter((s) => s.ok).length;
  const score =
    living.length === 0
      ? 100
      : Math.max(0, Math.round((passed / living.length) * 100) - rejects.length * 5);
  const ok = rejects.length === 0 && score >= 70;
  return {
    ok,
    score,
    rejects,
    summary: ok
      ? `Character Performance Studio accepted (score ${score}).`
      : `Studio rejected non-living beats: ${rejects.map((r) => r.code).join(", ")}`,
  };
}
