/**
 * Build chained scene memory from intents + optional AI Director continuity.
 * Nothing resets unless the story intentionally changes it.
 */

import type { DirectorPackage } from "../ai-director/types.js";
import type { BrandCharacterId } from "../brand/types.js";
import type { PerformanceDirectorPackage } from "../performance-director/types.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import { wardrobeFor } from "./wardrobe.js";
import type {
  CameraMemory,
  CharacterPoseMemory,
  EmotionMemory,
  LightingMemory,
  PropMemory,
  SceneCharacterMemory,
} from "./types.js";

const EMOTION_ORDER = [
  "Curious",
  "Thinking",
  "Understanding",
  "Success",
  "Celebration",
] as const;

export function buildSceneMemoryChain(input: {
  intents: ComposerSceneIntent[];
  director?: DirectorPackage | null;
  performance?: PerformanceDirectorPackage | null;
}): SceneCharacterMemory[] {
  const scenes: SceneCharacterMemory[] = [];
  let previous: SceneCharacterMemory | null = null;

  for (let index = 0; index < input.intents.length; index++) {
    const intent = input.intents[index]!;
    const directed = input.director?.scenes[index];
    const perf = input.performance?.scenes[index];
    const sceneId =
      directed?.sceneId ?? perf?.sceneId ?? `scene_${index + 1}_${intent.role}`;

    if (intent.role === "end-card") {
      const endMemory = buildEndCardMemory(sceneId, index, previous);
      scenes.push(endMemory);
      previous = endMemory;
      continue;
    }

    const characters = uniqueChars(
      perf?.cast.map((c) => c.character) ?? intent.characters,
    );
    const intentional = intentionalChanges(intent.role, previous);
    const memory = inheritOrSeed({
      sceneId,
      index,
      role: intent.role,
      characters,
      intent,
      directed,
      previous,
      intentional,
    });
    scenes.push(memory);
    previous = memory;
  }

  return scenes;
}

function inheritOrSeed(input: {
  sceneId: string;
  index: number;
  role: string;
  characters: BrandCharacterId[];
  intent: ComposerSceneIntent;
  directed: DirectorPackage["scenes"][number] | undefined;
  previous: SceneCharacterMemory | null;
  intentional: string[];
}): SceneCharacterMemory {
  const prev = input.previous;
  const state = input.directed?.continuityState;
  const bibleAssetPaths = input.characters.map((c) => wardrobeFor(c).bibleAsset);

  const poses = input.characters.map((character) =>
    poseForCharacter(character, state, prev, input.intentional),
  );

  const props = propsForScene(input.role, input.characters, prev, input.intentional);
  const room = roomForScene(input.role, input.directed, prev, input.intentional);
  const lighting = lightingForScene(input.directed, prev, input.intentional);
  const camera = cameraForScene(input.directed, prev, input.intentional);
  const emotion = emotionForScene(input.directed, input.role, prev);
  const animationEnergy =
    state?.movementSpeed ??
    prev?.animationEnergy ??
    energyForRole(input.role);

  const referenceImagePaths = [
    ...bibleAssetPaths,
    ...(prev?.lastFramePath ? [prev.lastFramePath] : []),
  ];

  return {
    sceneId: input.sceneId,
    index: input.index,
    role: input.role,
    characters: input.characters,
    poses,
    props,
    room,
    lighting,
    camera,
    emotion,
    animationEnergy,
    bibleAssetPaths,
    referenceImagePaths,
    inheritsFromSceneId: prev?.sceneId ?? null,
    intentionalChanges: input.intentional,
    ok: true,
    rejects: [],
  };
}

function poseForCharacter(
  character: BrandCharacterId,
  state: DirectorPackage["scenes"][number]["continuityState"] | undefined,
  prev: SceneCharacterMemory | null,
  intentional: string[],
): CharacterPoseMemory {
  const wardrobe = wardrobeFor(character);
  const prevPose = prev?.poses.find((p) => p.character === character);
  const allowPoseReset = intentional.includes("pose");

  if (prevPose && !allowPoseReset) {
    return {
      ...prevPose,
      // Soft carry — director may refine eye/face within same identity
      eyeDirection: state?.eyeDirection ?? prevPose.eyeDirection,
      facialExpression: state?.emotionLabel ?? prevPose.facialExpression,
      bodyOrientation: state?.bodyOrientation ?? prevPose.bodyOrientation,
      handPosition: state?.handPosition ?? prevPose.handPosition,
      position: state?.characterPosition ?? prevPose.position,
      clothing: wardrobe.clothing,
      hairstyle: wardrobe.hairstyle,
      accessories: wardrobe.accessories,
    };
  }

  return {
    character,
    position: state?.characterPosition ?? defaultPosition(character),
    bodyOrientation: state?.bodyOrientation ?? "facing camera-right three-quarter",
    eyeDirection: state?.eyeDirection ?? "toward scene partner / learning object",
    facialExpression: state?.emotionLabel ?? "curious soft focus",
    handPosition: state?.handPosition ?? "relaxed at mid-torso",
    activeHand: character === "amy-girl" ? "left" : "right",
    clothing: wardrobe.clothing,
    hairstyle: wardrobe.hairstyle,
    accessories: wardrobe.accessories,
  };
}

function propsForScene(
  role: string,
  characters: BrandCharacterId[],
  prev: SceneCharacterMemory | null,
  intentional: string[],
): PropMemory[] {
  const seedBook = (): PropMemory[] =>
    characters.includes("amy-girl")
      ? [
          {
            id: "purple-book",
            description: "small purple story/workbook",
            owner: "amy-girl",
            hand: "left",
            placement: "held in Amy Girl left hand near chest",
          },
        ]
      : [];

  // Story-driven prop placement (celebration: book set down).
  if (role === "transformation" && prev?.props.length) {
    return prev.props.map((p) =>
      p.id === "purple-book"
        ? {
            ...p,
            hand: "none",
            placement: "placed on desk intentionally after learning beat",
          }
        : { ...p },
    );
  }

  if (prev && !intentional.includes("props") && prev.props.length > 0) {
    return prev.props.map((p) => ({ ...p }));
  }

  // Introduce book once when girl enters a learning beat (story seed, not drift).
  if (
    (role === "feature" || role === "emotion" || role === "problem" || role === "hook") &&
    characters.includes("amy-girl")
  ) {
    if (!prev?.props.length) return seedBook();
    return prev.props.map((p) => ({ ...p }));
  }

  return prev?.props.map((p) => ({ ...p })) ?? [];
}

function roomForScene(
  role: string,
  directed: DirectorPackage["scenes"][number] | undefined,
  prev: SceneCharacterMemory | null,
  intentional: string[],
): string {
  if (prev && !intentional.includes("room")) {
    return prev.room;
  }
  if (role === "cta") return "premium purple CTA hold — same home purple language";
  return (
    directed?.blocking.positions ??
    prev?.room ??
    "simple warm Indian family home study / reading corner"
  );
}

function lightingForScene(
  directed: DirectorPackage["scenes"][number] | undefined,
  prev: SceneCharacterMemory | null,
  intentional: string[],
): LightingMemory {
  if (prev && !intentional.includes("lighting")) {
    return { ...prev.lighting };
  }
  const mood = directed?.lighting.mood ?? prev?.lighting.mood ?? "soft-daylight";
  return {
    timeOfDay: prev?.lighting.timeOfDay ?? "late morning",
    windowDirection:
      directed?.continuityState.lightingDirection ??
      prev?.lighting.windowDirection ??
      "window camera-left",
    sunlight: prev?.lighting.sunlight ?? "soft practical daylight",
    shadowDirection: prev?.lighting.shadowDirection ?? "soft shadow camera-right",
    roomBrightness: prev?.lighting.roomBrightness ?? "bright-comfortable",
    mood,
  };
}

function cameraForScene(
  directed: DirectorPackage["scenes"][number] | undefined,
  prev: SceneCharacterMemory | null,
  intentional: string[],
): CameraMemory {
  const movement =
    directed?.camera.movement ?? prev?.camera.movement ?? "slow-push-in";
  const momentum =
    directed?.continuityState.cameraMomentum ??
    prev?.camera.momentum ??
    "slow-push-in";

  if (prev && !intentional.includes("camera")) {
    return {
      momentum,
      movement,
      framingNote:
        directed?.camera.framing ??
        `Continue from previous end frame — ${prev.camera.continueFrom}`,
      continueFrom: `End of ${movement}; next shot starts matched to this framing`,
    };
  }

  return {
    momentum,
    movement,
    framingNote: directed?.camera.framing ?? "establish then settle",
    continueFrom: `End of ${movement}; next shot starts matched to this framing`,
  };
}

function emotionForScene(
  directed: DirectorPackage["scenes"][number] | undefined,
  role: string,
  prev: SceneCharacterMemory | null,
): EmotionMemory {
  let stage =
    directed?.emotion.emotionArc ??
    directed?.continuityState.emotionArc ??
    defaultEmotionStage(role);
  const previousStage = prev?.emotion.stage ?? null;

  if (previousStage) {
    const prevIdx = EMOTION_ORDER.indexOf(
      previousStage as (typeof EMOTION_ORDER)[number],
    );
    const nextIdx = EMOTION_ORDER.indexOf(stage as (typeof EMOTION_ORDER)[number]);
    if (prevIdx >= 0 && nextIdx >= 0 && nextIdx < prevIdx) {
      stage = previousStage;
    }
    // Never jump more than one major stage without intermediate
    if (prevIdx >= 0 && nextIdx >= 0 && nextIdx - prevIdx > 1) {
      stage = EMOTION_ORDER[Math.min(prevIdx + 1, EMOTION_ORDER.length - 1)]!;
    }
  }

  return {
    stage,
    label:
      directed?.emotion.targetEmotion ??
      directed?.continuityState.emotionLabel ??
      stage,
    energy: directed?.continuityState.movementSpeed ?? prev?.emotion.energy ?? "measured",
    previousStage,
  };
}

function intentionalChanges(
  role: string,
  previous: SceneCharacterMemory | null,
): string[] {
  if (!previous) return ["seed"];
  const changes: string[] = [];
  if (role === "transformation") changes.push("props", "pose", "emotion");
  if (role === "cta") changes.push("room", "camera", "pose");
  if (role === "feature" && previous.role === "emotion") changes.push("pose");
  if (role === "bridge") changes.push("pose");
  return changes;
}

function buildEndCardMemory(
  sceneId: string,
  index: number,
  previous: SceneCharacterMemory | null,
): SceneCharacterMemory {
  return {
    sceneId,
    index,
    role: "end-card",
    characters: ["amy-ai"],
    poses: previous
      ? previous.poses
          .filter((p) => p.character === "amy-ai")
          .map((p) => ({ ...p, facialExpression: "warm settle smile" }))
      : [
          {
            character: "amy-ai",
            position: "center settle",
            bodyOrientation: "facing camera",
            eyeDirection: "to camera",
            facialExpression: "warm settle smile",
            handPosition: "gentle welcome",
            activeHand: "right",
            ...(() => {
              const w = wardrobeFor("amy-ai");
              return {
                clothing: w.clothing,
                hairstyle: w.hairstyle,
                accessories: w.accessories,
              };
            })(),
          },
        ],
    props: [],
    room: "premium purple brand settle",
    lighting: previous?.lighting ?? {
      timeOfDay: "brand hold",
      windowDirection: "soft volumetric",
      sunlight: "purple rim",
      shadowDirection: "soft",
      roomBrightness: "glow",
      mood: "end-card-glow",
    },
    camera: {
      momentum: "settle",
      movement: "static-hold",
      framingNote: "Brand settle — no teleport from previous home",
      continueFrom: "End card hold",
    },
    emotion: {
      stage: "Celebration",
      label: "Pride",
      energy: "settle",
      previousStage: previous?.emotion.stage ?? null,
    },
    animationEnergy: "settle",
    bibleAssetPaths: [wardrobeFor("amy-ai").bibleAsset],
    referenceImagePaths: [
      wardrobeFor("amy-ai").bibleAsset,
      ...(previous?.lastFramePath ? [previous.lastFramePath] : []),
    ],
    inheritsFromSceneId: previous?.sceneId ?? null,
    intentionalChanges: ["end-card", "room", "camera"],
    ok: true,
    rejects: [],
  };
}

function defaultPosition(character: BrandCharacterId): string {
  if (character === "amy-ai") return "child-height midground left-of-center";
  if (character === "amy-girl") return "midground center-right at desk";
  return "midground right playful stance";
}

function defaultEmotionStage(role: string): string {
  switch (role) {
    case "hook":
      return "Curious";
    case "problem":
      return "Thinking";
    case "emotion":
      return "Thinking";
    case "feature":
      return "Understanding";
    case "transformation":
      return "Success";
    case "cta":
      return "Celebration";
    default:
      return "Understanding";
  }
}

function energyForRole(role: string): string {
  if (role === "hook") return "urgent-curious";
  if (role === "transformation") return "celebratory";
  if (role === "cta") return "invite-settle";
  return "measured";
}

function uniqueChars(ids: BrandCharacterId[]): BrandCharacterId[] {
  const order: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];
  const set = new Set(ids);
  return order.filter((id) => set.has(id));
}
