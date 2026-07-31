/**
 * Professional shot language — automatic selection from story intent.
 */

import type { CameraMove } from "../types/storyboard.js";
import type {
  CameraAngle,
  DirectedCameraPlan,
  DirectorBeatRole,
  DirectorCameraMovement,
  DirectorShotType,
  ShotSize,
} from "./types.js";

interface ShotRecipe {
  shotType: DirectorShotType;
  shotSize: ShotSize;
  angle: CameraAngle;
  movement: DirectorCameraMovement;
  composerCamera: CameraMove;
  framing: string;
  subjectFraming: string;
}

/** Role → primary cinematic recipe (not random). */
const ROLE_SHOTS: Record<DirectorBeatRole, ShotRecipe> = {
  hook: {
    shotType: "Push-In",
    shotSize: "medium",
    angle: "eye-level",
    movement: "slow-push-in",
    composerCamera: "Push",
    framing: "Intimate cold-open; subject fills upper two-thirds of 9:16",
    subjectFraming: "Parent or child face + hands in story context; no product UI yet",
  },
  problem: {
    shotType: "Medium Shot",
    shotSize: "medium",
    angle: "eye-level",
    movement: "slow-dolly",
    composerCamera: "Push",
    framing: "Slow dolly into the recognizable parenting friction beat — filmed, not locked-off",
    subjectFraming: "Parent and child sharing the frame; tension readable muted; they look at each other",
  },
  emotion: {
    shotType: "Close-Up",
    shotSize: "close-up",
    angle: "eye-level",
    movement: "slow-push-in",
    composerCamera: "Zoom In",
    framing: "Emotion-first close-up; eyes carry the beat",
    subjectFraming: "Eyes and micro-expression dominate; soft bokeh background",
  },
  feature: {
    shotType: "Over-the-Shoulder",
    shotSize: "medium",
    angle: "over-the-shoulder",
    movement: "parallax-drift",
    composerCamera: "Push",
    framing: "Guide reveals AmyNest as a warm helper — never a UI slideshow",
    subjectFraming: "Amy AI or child + app UI as story prop in environment",
  },
  transformation: {
    shotType: "Pull-Out",
    shotSize: "wide",
    angle: "eye-level",
    movement: "gentle-pull-out",
    composerCamera: "Pull",
    framing: "Reveal calm after the storm — hope in the room",
    subjectFraming: "Parent-child together; space opens; lighter posture",
  },
  cta: {
    shotType: "Medium Shot",
    shotSize: "medium",
    angle: "eye-level",
    movement: "slow-dolly",
    composerCamera: "Push",
    framing: "Soft dolly settle before end card; hope already earned — mentor invite, not ad freeze",
    subjectFraming: "Amy AI warm mentor presence; CTA readable without shouting",
  },
  "end-card": {
    shotType: "Wide Shot",
    shotSize: "wide",
    angle: "eye-level",
    movement: "static-hold",
    composerCamera: "Static",
    framing: "Centered branded end card hold",
    subjectFraming: "App icon + store badges + download lines, locked brand kit",
  },
  bridge: {
    shotType: "Tracking Shot",
    shotSize: "medium",
    angle: "eye-level",
    movement: "tracking",
    composerCamera: "Pan Right",
    framing: "Bridge beat — keep motion alive between story chapters",
    subjectFraming: "Follow subject energy without identity jump",
  },
};

/** Secondary recipes for split clips of the same role (part 2+). */
const ROLE_ALT_SHOTS: Partial<Record<DirectorBeatRole, ShotRecipe>> = {
  hook: {
    shotType: "Reaction Shot",
    shotSize: "close-up",
    angle: "eye-level",
    movement: "static-hold",
    composerCamera: "Hold",
    framing: "Reaction beat after the cold open",
    subjectFraming: "Eyes react; situation already established",
  },
  problem: {
    shotType: "Insert Shot",
    shotSize: "macro",
    angle: "high-angle",
    movement: "tilt-reveal",
    composerCamera: "Tilt",
    framing: "Detail insert that sells the struggle without words",
    subjectFraming: "Pencil, notebook, clock, or routine prop in hands",
  },
  emotion: {
    shotType: "Extreme Close-Up",
    shotSize: "extreme-close-up",
    angle: "eye-level",
    movement: "static-hold",
    composerCamera: "Hold",
    framing: "Micro-expression extreme close-up",
    subjectFraming: "Eyes only — hope begins here",
  },
  feature: {
    shotType: "Insert Shot",
    shotSize: "close-up",
    angle: "high-angle",
    movement: "slow-push-in",
    composerCamera: "Zoom In",
    framing: "Feature UI as living prop, not a PowerPoint slide",
    subjectFraming: "Progress ring / lesson card animates in real hands",
  },
  transformation: {
    shotType: "Orbit",
    shotSize: "medium",
    angle: "low-angle",
    movement: "orbit",
    composerCamera: "Pan Left",
    framing: "Gentle orbit celebrating the win",
    subjectFraming: "Family together; confident posture; warm light",
  },
};

export function selectShotForIntent(input: {
  role: DirectorBeatRole;
  roleOccurrence: number;
  category: string;
}): DirectedCameraPlan {
  const base =
    input.roleOccurrence > 0 && ROLE_ALT_SHOTS[input.role]
      ? ROLE_ALT_SHOTS[input.role]!
      : ROLE_SHOTS[input.role];

  return applyCategoryTint({ ...base }, input.category, input.role);
}

function applyCategoryTint(
  recipe: ShotRecipe,
  category: string,
  role: DirectorBeatRole,
): DirectedCameraPlan {
  if (/Astro/i.test(category) && (role === "emotion" || role === "transformation")) {
    return {
      ...recipe,
      shotType: role === "emotion" ? "High Angle" : "Orbit",
      angle: role === "emotion" ? "high-angle" : "low-angle",
      movement: role === "transformation" ? "orbit" : recipe.movement,
      framing: `${recipe.framing} Soft cosmic twilight accents — never neon horror.`,
    };
  }
  if (/Games|Creativity/i.test(category) && role === "hook") {
    return {
      ...recipe,
      shotType: "Low Angle",
      angle: "low-angle",
      movement: "slow-push-in",
      composerCamera: "Push",
      framing: `${recipe.framing} Playful low angle for energy without chaos.`,
    };
  }
  if (role === "feature" && /Speech|Learning|Reading|Math/i.test(category)) {
    return {
      ...recipe,
      shotType: "POV",
      angle: "pov",
      framing: `${recipe.framing} Child POV into the learning moment.`,
      subjectFraming: "From child's eye-line into AmyNest lesson / speech coach UI",
    };
  }
  return { ...recipe };
}

export function describeShotLanguage(plan: DirectedCameraPlan): string {
  return [
    `Shot: ${plan.shotType}`,
    `Size: ${plan.shotSize}`,
    `Angle: ${plan.angle}`,
    `Movement: ${plan.movement}`,
    `Framing: ${plan.framing}`,
    `Subject: ${plan.subjectFraming}`,
  ].join(" | ");
}
