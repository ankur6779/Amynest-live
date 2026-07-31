/**
 * Internal goals → intentional movement (never random).
 */

import type { BrandCharacterId } from "../brand/types.js";
import type { DirectorBeatRole } from "../ai-director/types.js";
import type {
  BodyPosture,
  CharacterActingBrief,
  CharacterInternalGoal,
  ChildEnergyVerb,
  EyeFocusTarget,
  FaceEmotionCue,
  MentorVerb,
} from "./types.js";

const GOALS: Record<BrandCharacterId, CharacterInternalGoal> = {
  "amy-ai": "help-teach-encourage-protect",
  "amy-girl": "understand-try-learn-celebrate",
  "amy-boy": "explore-discover-experiment-fun",
};

export function internalGoal(character: BrandCharacterId): CharacterInternalGoal {
  return GOALS[character];
}

export function buildCharacterBrief(input: {
  character: BrandCharacterId;
  role: DirectorBeatRole;
  speaker: string;
  partners: BrandCharacterId[];
}): CharacterActingBrief {
  if (input.character === "amy-ai") {
    return amyBrief(input.role, input.speaker, input.partners);
  }
  if (input.character === "amy-girl") {
    return girlBrief(input.role, input.speaker, input.partners);
  }
  return boyBrief(input.role, input.speaker, input.partners);
}

function amyBrief(
  role: DirectorBeatRole,
  speaker: string,
  partners: BrandCharacterId[],
): CharacterActingBrief {
  const eyeFocus = eyeToward(speaker, "amy-ai", partners, "amy-girl");
  const face = faceForRole(role, "mentor");
  const body: BodyPosture[] =
    role === "cta"
      ? ["weight-shift", "shoulder-soft", "gentle-hand-gesture"]
      : ["kneel", "lean-forward", "gentle-hand-gesture"];

  const energyVerbs: MentorVerb[] =
    role === "transformation"
      ? ["celebrate-together", "high-five", "encourage"]
      : role === "cta"
        ? ["encourage", "walk-beside"]
        : role === "feature"
          ? ["kneel", "sit-with", "point-softly", "encourage"]
          : ["comfort", "encourage", "kneel"];

  return {
    character: "amy-ai",
    internalGoal: "help-teach-encourage-protect",
    intention:
      "Amy AI goal: help, teach, encourage, protect — every move serves the child; never a presenter stance or hard sell",
    face,
    eyeFocus,
    body,
    energyVerbs,
    antiPattern:
      "Never stand like a presenter/mascot/narrator; never hard-sell; never floating logo energy",
  };
}

function girlBrief(
  role: DirectorBeatRole,
  speaker: string,
  partners: BrandCharacterId[],
): CharacterActingBrief {
  const eyeFocus = eyeToward(speaker, "amy-girl", partners, "amy-ai");
  const face = faceForRole(role, "learner");
  const body: BodyPosture[] =
    role === "hook" || role === "problem"
      ? ["sit-naturally", "lean-forward", "weight-shift"]
      : ["lean-forward", "weight-shift", "gentle-hand-gesture"];

  const energyVerbs: ChildEnergyVerb[] =
    role === "transformation"
      ? ["bounce", "giggle", "celebrate", "hug"]
      : role === "feature"
        ? ["lean", "peek", "wave"]
        : role === "hook" || role === "problem"
          ? ["lean", "peek", "look-around"]
          : ["bounce", "wave", "react-naturally"];

  return {
    character: "amy-girl",
    internalGoal: "understand-try-learn-celebrate",
    intention:
      "Amy Girl goal: understand, try, learn, celebrate — child intention in every beat, never robotic posing",
    face,
    eyeFocus,
    body,
    energyVerbs,
    antiPattern: "Never move like a robot; never blank stare; never mannequin stillness",
  };
}

function boyBrief(
  role: DirectorBeatRole,
  speaker: string,
  partners: BrandCharacterId[],
): CharacterActingBrief {
  const eyeFocus = eyeToward(speaker, "amy-boy", partners, "amy-ai");
  const face = faceForRole(role, "explorer");
  const body: BodyPosture[] = [
    "weight-shift",
    "cross-step",
    "shoulder-soft",
    "gentle-hand-gesture",
  ];
  const energyVerbs: ChildEnergyVerb[] =
    role === "transformation" || role === "cta"
      ? ["celebrate", "jump-lightly", "point", "react-naturally"]
      : ["look-around", "point", "run", "react-naturally"];

  return {
    character: "amy-boy",
    internalGoal: "explore-discover-experiment-fun",
    intention:
      "Amy Boy goal: explore, discover, experiment, have fun — playful intention, never stiff parade pose",
    face,
    eyeFocus,
    body,
    energyVerbs,
    antiPattern: "Never stiff parade pose; never stare into empty space",
  };
}

function faceForRole(
  role: DirectorBeatRole,
  kind: "mentor" | "learner" | "explorer",
): FaceEmotionCue[] {
  switch (role) {
    case "hook":
      return kind === "learner"
        ? ["thinking-face", "confusion", "eyebrow-lift"]
        : ["hope", "tiny-smile"];
    case "problem":
      return ["confusion", "thinking-face", "eyebrow-lift"];
    case "emotion":
      return ["hope", "relief", "tiny-smile"];
    case "feature":
      return kind === "mentor"
        ? ["hope", "tiny-smile", "eyebrow-lift"]
        : ["soft-surprise", "hope", "thinking-face"];
    case "transformation":
      return ["pride", "confidence", "tiny-smile"];
    case "cta":
      return ["hope", "tiny-smile", "confidence"];
    case "end-card":
      return ["tiny-smile", "relief"];
    case "bridge":
      return ["hope", "tiny-smile"];
  }
}

function eyeToward(
  speaker: string,
  self: BrandCharacterId,
  partners: BrandCharacterId[],
  fallbackPartner: BrandCharacterId,
): EyeFocusTarget {
  if (speaker === self) {
    const other = partners.find((p) => p !== self) ?? fallbackPartner;
    if (other === "amy-ai") return "amy-ai";
    if (other === "amy-girl") return "amy-girl";
    if (other === "amy-boy") return "amy-boy";
    return "partner";
  }
  if (speaker === "amy-ai") return "amy-ai";
  if (speaker === "amy-girl") return "amy-girl";
  if (speaker === "amy-boy") return "amy-boy";
  if (speaker === "external-narration") {
    if (partners.includes("amy-ai") && self !== "amy-ai") return "amy-ai";
    return "object";
  }
  return "shared-glance";
}
