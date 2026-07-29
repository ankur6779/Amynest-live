/**
 * Motion-first Veo prompts for official AmyNest characters.
 * Identity comes from the first-frame keyframe — prompts describe PERFORMANCE only.
 */

import type { CompositionShotPlan } from "./types.js";

const NEGATIVE = [
  "random children",
  "new mascot designs",
  "different hairstyle",
  "clothing redesign",
  "logo recreation",
  "fullscreen app screenshot",
  "PowerPoint",
  "slideshow",
  "static pose",
  "horror",
  "distress",
  "text overlays",
  "watermarks",
  "morphing face",
].join(", ");

export function performancePrompt(shot: CompositionShotPlan): {
  prompt: string;
  negativePrompt: string;
} {
  const camera =
    shot.camera === "push-in"
      ? "slow cinematic push-in"
      : shot.camera === "pan-right"
        ? "gentle camera pan right"
        : shot.camera === "pan-left"
          ? "gentle camera pan left"
          : shot.camera === "orbit-soft"
            ? "soft orbital camera drift"
            : "slow cinematic zoom";

  const identity =
    shot.character === "amy-ai"
      ? "Keep the exact same Amy AI character from the first frame — identical white soft-polymer body, purple AmyAI cap, headphones, purple eyes, halo. Do not redesign."
      : shot.character === "amy-girl"
        ? "Keep the exact same Amy Girl from the first frame — identical brown side ponytail with yellow bow, plain purple hoodie, dark purple leggings, purple sneakers with white soles, brown eyes. Do not redesign."
        : "Keep the exact same Amy Boy from the first frame — identical fluffy dark brown hair, plain purple hoodie, dark purple joggers, purple sneakers with white soles, brown eyes. Do not redesign.";

  const env =
    shot.environment === "living-room"
      ? "cozy modern living room with soft purple rim light"
      : shot.environment === "study-desk"
        ? "warm child study desk with soft daylight and pastel stationery"
        : shot.environment === "child-bedroom"
          ? "cozy child's bedroom with fairy lights and soft morning light"
          : shot.environment === "cta-stage"
            ? "premium purple gradient stage with soft volumetric light"
            : "premium Pixar family environment";

  const appNote =
    shot.role === "amy-girl-learn"
      ? "A tablet in her hands briefly shows a clean Study Zone lesson card with a purple progress ring — UI readable for under two seconds, never fullscreen. She interacts with the device."
      : "";

  const prompt = [
    "Vertical 9:16 Pixar-quality family animated commercial shot.",
    "Animate continuous motion from the first frame — never a static pose.",
    identity,
    `Environment: ${env}.`,
    `Performance: ${shot.performance}.`,
    "Include body movement, eye blinks, facial expression change, and clear hand gestures.",
    `Camera: ${camera}.`,
    "Foreground, midground, and background depth with cinematic lighting.",
    appNote,
    "No random humans replacing the official character. No slideshow energy.",
    `Duration ${shot.durationSeconds} seconds.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { prompt, negativePrompt: NEGATIVE };
}
