/**
 * Bridge Character Memory Engine → creative-composition Veo prompts.
 * Additive — does not alter composition architecture.
 */

import type { CompositionShotPlan } from "../creative-composition/types.js";
import type { BrandCharacterId } from "../brand/types.js";
import { wardrobeFor } from "./wardrobe.js";
import { enrichVeoPromptWithMemory } from "./format.js";
import { gateSceneMemory } from "./quality-gate.js";
import type { SceneCharacterMemory } from "./types.js";

function roleFromShot(shot: CompositionShotPlan): string {
  switch (shot.role) {
    case "hook":
      return "hook";
    case "amy-host":
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

function emotionStageForRole(role: string): string {
  if (role === "hook") return "Curious";
  if (role === "feature") return "Understanding";
  if (role === "transformation") return "Success";
  if (role === "cta") return "Celebration";
  return "Thinking";
}

export function memoryPlanForCompositionShot(
  shot: CompositionShotPlan,
  previous: SceneCharacterMemory | null = null,
): SceneCharacterMemory {
  const role = roleFromShot(shot);
  const characters: BrandCharacterId[] = [shot.character];
  if (role === "transformation") {
    characters.push("amy-ai", "amy-girl", "amy-boy");
  } else if (role === "feature" && shot.character === "amy-girl") {
    characters.push("amy-ai");
  } else if (role === "feature" && shot.character === "amy-ai") {
    characters.push("amy-girl");
  }

  const uniq = (["amy-ai", "amy-girl", "amy-boy"] as BrandCharacterId[]).filter(
    (id) => characters.includes(id),
  );
  const intentional =
    !previous
      ? ["seed"]
      : role === "transformation"
        ? ["props", "pose", "emotion"]
        : role === "cta"
          ? ["room", "camera", "pose"]
          : [];

  const bibleAssetPaths = uniq.map((c) => wardrobeFor(c).bibleAsset);
  const room =
    previous && !intentional.includes("room")
      ? previous.room
      : environmentRoom(shot.environment);

  const lighting =
    previous && !intentional.includes("lighting")
      ? { ...previous.lighting }
      : {
          timeOfDay: "late morning",
          windowDirection: "window camera-left",
          sunlight: "soft practical daylight",
          shadowDirection: "soft shadow camera-right",
          roomBrightness: "bright-comfortable",
          mood: "soft-daylight",
        };

  const stage = emotionStageForRole(role);
  const poses = uniq.map((character) => {
    const w = wardrobeFor(character);
    const prevPose = previous?.poses.find((p) => p.character === character);
    if (prevPose && !intentional.includes("pose")) {
      return {
        ...prevPose,
        facialExpression: shot.emotionBeat ?? prevPose.facialExpression,
        clothing: w.clothing,
        hairstyle: w.hairstyle,
        accessories: w.accessories,
      };
    }
    return {
      character,
      position:
        character === "amy-ai"
          ? "child-height midground"
          : "midground at learning space",
      bodyOrientation: "three-quarter toward partner",
      eyeDirection: shot.eyeLine ?? "toward partner / object",
      facialExpression: shot.emotionBeat ?? stage,
      handPosition: "natural mid-gesture",
      activeHand:
        character === "amy-girl" ? ("left" as const) : ("right" as const),
      clothing: w.clothing,
      hairstyle: w.hairstyle,
      accessories: w.accessories,
    };
  });

  const props =
    previous?.props?.length && !intentional.includes("props")
      ? previous.props.map((p) => ({ ...p }))
      : role === "transformation" && previous?.props.length
        ? previous.props.map((p) =>
            p.id === "purple-book"
              ? {
                  ...p,
                  hand: "none" as const,
                  placement: "placed on desk intentionally",
                }
              : { ...p },
          )
        : shot.character === "amy-girl"
          ? [
              {
                id: "purple-book",
                description: "small purple story/workbook",
                owner: "amy-girl" as const,
                hand: "left" as const,
                placement: "held in Amy Girl left hand",
              },
            ]
          : previous?.props.map((p) => ({ ...p })) ?? [];

  const draft: SceneCharacterMemory = {
    sceneId: shot.id,
    index: 0,
    role,
    characters: uniq,
    poses,
    props,
    room,
    lighting,
    camera: {
      momentum: String(shot.camera),
      movement: String(shot.camera),
      framingNote: previous
        ? `Continue from previous end frame (${previous.camera.continueFrom}) into ${shot.camera}`
        : `Establish with ${shot.camera}`,
      continueFrom: `End of ${shot.camera}; next shot matches this framing`,
    },
    emotion: {
      stage,
      label: shot.emotionBeat ?? stage,
      energy: "measured",
      previousStage: previous?.emotion.stage ?? null,
    },
    animationEnergy: shot.performance,
    bibleAssetPaths,
    referenceImagePaths: [
      ...bibleAssetPaths,
      ...(previous?.lastFramePath ? [previous.lastFramePath] : []),
    ],
    inheritsFromSceneId: previous?.sceneId ?? null,
    intentionalChanges: intentional,
    ok: true,
    rejects: [],
  };

  return gateSceneMemory(draft, previous);
}

export function enrichCompositionWithCharacterMemory(
  shot: CompositionShotPlan,
  prompt: string,
  negativePrompt: string,
  previous: SceneCharacterMemory | null = null,
): { prompt: string; negativePrompt: string; memory: SceneCharacterMemory } {
  const memory = memoryPlanForCompositionShot(shot, previous);
  const enriched = enrichVeoPromptWithMemory(prompt, negativePrompt, memory);
  return { ...enriched, memory };
}

function environmentRoom(env: CompositionShotPlan["environment"]): string {
  switch (env) {
    case "study-desk":
      return "simple child study desk / reading corner";
    case "child-bedroom":
      return "quiet child's bedroom reading corner";
    case "kitchen-table":
      return "warm family kitchen table";
    case "living-room":
      return "simple cozy living room";
    case "playroom":
      return "calm play corner";
    case "cta-stage":
      return "premium purple CTA hold";
    default:
      return "simple warm family home learning space";
  }
}
