/**
 * Map creative-composition shots → Performance Director plans (Veo path).
 * Additive — does not alter composition architecture.
 */

import type { CompositionShotPlan } from "../creative-composition/types.js";
import type { DirectorBeatRole } from "../ai-director/types.js";
import { castScenePerformance } from "./casting.js";
import { applyMicroActing } from "./micro-acting.js";
import { enrichVeoPromptWithPerformance } from "./format.js";
import type { ScenePerformancePlan } from "./types.js";

function roleFromShot(shot: CompositionShotPlan): DirectorBeatRole {
  switch (shot.role) {
    case "hook":
      return "hook";
    case "amy-host":
      return "feature";
    case "amy-girl-learn":
      return "feature";
    case "amy-boy-celebrate":
      return "transformation";
    case "cta":
      return "cta";
    default:
      return "bridge";
  }
}

export function performancePlanForCompositionShot(
  shot: CompositionShotPlan,
): ScenePerformancePlan {
  const role = roleFromShot(shot);
  // Complexity caps: solo / duo preferred; trio only for celebration.
  const existing = [shot.character];
  if (role === "hook" || role === "bridge") {
    // keep solo — one visual objective
  } else if (role === "transformation") {
    existing.push("amy-girl", "amy-ai", "amy-boy");
  } else if (shot.character === "amy-girl") {
    existing.push("amy-ai");
  } else if (shot.character === "amy-ai") {
    existing.push("amy-girl");
  } else if (shot.character === "amy-boy") {
    existing.push("amy-ai");
  }

  let plan = castScenePerformance({
    sceneId: shot.id,
    index: 0,
    role,
    narration: shot.spokenLine || shot.caption,
    durationSeconds: shot.durationSeconds,
    existingCharacters: existing,
  });

  // Honor composition speechMode when present
  if (shot.speechMode === "listening" || shot.speechMode === "reacting") {
    plan = {
      ...plan,
      speaker: "external-narration",
      lipSyncStrategy: "external-narration-reactions",
      cast: plan.cast.map((c) =>
        c.character === shot.character
          ? {
              character: c.character,
              role: shot.speechMode === "listening" ? "listening" : "reacting",
              beat:
                shot.speechMode === "listening"
                  ? "Primary on-screen listener — mouth soft/closed; eyes alive"
                  : "Primary reactor — emotion face, no fake dialogue mouth",
            }
          : c.role === "speaking"
            ? {
                ...c,
                role: "reacting",
                beat: "Support reaction — no fake speaking over external VO",
              }
            : c,
      ),
    };
  } else if (shot.speechMode === "speaking") {
    plan = {
      ...plan,
      speaker: shot.character,
      lipSyncStrategy:
        shot.camera === "over-shoulder" || shot.camera === "close-up"
          ? "speaking-beat-ots"
          : "speaking-beat-medium",
      cast: plan.cast.map((c) =>
        c.character === shot.character
          ? {
              character: c.character,
              role: "speaking",
              beat: `SPEAKING beat: "${(shot.spokenLine || shot.caption).slice(0, 100)}" — mouth moves with line energy; gesture + eye focus`,
            }
          : c,
      ),
    };
  }

  plan.groupScene = plan.cast.length >= 2;
  return applyMicroActing(plan, shot.durationSeconds);
}

export function enrichCompositionPerformancePrompt(
  shot: CompositionShotPlan,
  prompt: string,
  negativePrompt: string,
): { prompt: string; negativePrompt: string } {
  const plan = performancePlanForCompositionShot(shot);
  return enrichVeoPromptWithPerformance(prompt, negativePrompt, plan);
}
