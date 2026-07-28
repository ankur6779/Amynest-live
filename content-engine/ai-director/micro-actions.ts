/**
 * Micro actions — small natural motions that keep directed scenes alive.
 */

import type { DirectorBeatRole, TargetEmotionLabel } from "./types.js";

const ROLE_ACTIONS: Record<DirectorBeatRole, string[]> = {
  hook: [
    "Parent sighs softly",
    "Child taps pencil once",
    "Shoulders drop a millimeter",
    "Curtain moves with soft window air",
  ],
  problem: [
    "Child hesitates before writing",
    "Parent's hand pauses mid-air",
    "Notebook page flutters",
    "Eyes flick to the clock then away",
  ],
  emotion: [
    "Eyes soften and brighten",
    "Amy AI smiles gently",
    "Sunlight shifts across the table",
    "A small breath of relief",
  ],
  feature: [
    "Progress ring animates a gentle tick",
    "Amy AI orb glows softly once",
    "Lesson card slides into place with weight",
    "Child leans in a few centimeters",
  ],
  transformation: [
    "Parent and child share a small smile",
    "Hair moves slightly as they lean together",
    "Checklist checkmark blooms quietly",
    "Room feels brighter without a hard cut",
  ],
  cta: [
    "Amy AI nods once, warmly",
    "Soft purple glow breathes on the badge edge",
    "Family moment holds in the background",
  ],
  "end-card": [
    "App icon settles with a soft scale",
    "Store badges fade in cleanly",
    "Brand purple wash holds steady",
  ],
  bridge: [
    "Camera eases to the next beat",
    "A prop shifts naturally in hand",
  ],
};

const EMOTION_EXTRA: Partial<Record<TargetEmotionLabel, string[]>> = {
  "Parent frustration": ["Exhale through the nose", "Grip on the pencil loosens then tightens"],
  "Child hesitation": ["Toe scuffs the floor softly", "Glance seeks parent's face"],
  Hope: ["Chin lifts a degree", "Window light warms the cheek"],
  Curiosity: ["Head tilts a few degrees", "Eyes widen with interest"],
  Confidence: ["Spine lengthens", "Shared high-five energy without slapstick"],
  Joy: ["Soft laugh in the eyes", "Shoulders relax fully"],
  "Calm reassurance": ["Breathing slows visibly", "Hands rest open"],
  Pride: ["Parent's hand rests gently on child's shoulder"],
  Bonding: ["They lean into the same frame"],
  Relief: ["Forehead softens", "The room exhales"],
};

export function selectMicroActions(input: {
  role: DirectorBeatRole;
  targetEmotion: TargetEmotionLabel;
  sceneIndex: number;
  count?: number;
}): string[] {
  const count = input.count ?? 2;
  const pool = [
    ...ROLE_ACTIONS[input.role],
    ...(EMOTION_EXTRA[input.targetEmotion] ?? []),
  ];
  if (pool.length === 0) return ["Subtle ambient life in the frame"];

  // Deterministic rotation — never random AI chance.
  const start = input.sceneIndex % pool.length;
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(pool[(start + i) % pool.length]!);
  }
  return picked;
}

export function formatMicroActions(actions: string[]): string {
  return actions.map((a) => `- ${a}`).join("\n");
}
