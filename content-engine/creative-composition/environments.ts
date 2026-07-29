/**
 * Environment + character plate prompts for Imagen.
 * Characters are generated inside designed worlds — never pasted as fullscreen PNGs.
 */

import type { EnvironmentId, ShotRole } from "./types.js";

const ENV_LOOK: Record<EnvironmentId, string> = {
  "kitchen-table":
    "warm Indian family kitchen table at golden hour, unfinished kids worksheets scattered, soft window light, shallow depth of field, cinematic bokeh",
  "child-bedroom":
    "cozy child's bedroom with soft fairy lights, tidy study nook, lavender and cream palette, gentle morning light, cinematic depth",
  "study-desk":
    "child study desk with books and pastel stationery, soft daylight from left, warm wood tones, purple accent glow, premium Pixar lighting",
  "living-room":
    "modern cozy living room with sofa and plants, soft purple ambient rim light, clean premium family space, cinematic wide depth",
  playroom:
    "bright playful kids playroom with soft toys blurred in background, cheerful daylight, safe family atmosphere",
  "magic-learning-world":
    "soft magical learning world with floating gentle stars and purple nebula bokeh, premium storybook lighting, never dark horror",
  "cta-stage":
    "premium purple gradient stage with soft volumetric light rays, deep #461EA8 to #6A2CFF, clean negative space for CTA, cinematic",
};

export function environmentPrompt(env: EnvironmentId): string {
  return [
    "Vertical 9:16 cinematic still, 1080x1920 framing.",
    ENV_LOOK[env],
    "Foreground, midground, and background layers clearly separated.",
    "Photoreal-meets-Pixar premium family advertisement look.",
    "No text, no logos, no watermarks, no UI screenshots, no stickers.",
  ].join(" ");
}

export function cinematicPlatePrompt(input: {
  role: ShotRole;
  environment: EnvironmentId;
  character: "amy-ai" | "amy-girl" | "none";
  performance: string;
}): string {
  const env = environmentPrompt(input.environment);
  if (input.character === "none") {
    return [
      env,
      "Emotional parenting moment suitable for a cold-open advertisement.",
      "A parent looking at unfinished worksheets while a child looks bored nearby.",
      "Faces warm and natural, no horror, no distress exaggeration.",
    ].join(" ");
  }

  const amyAi =
    "Official Amy AI character ONLY: floating rounded white soft-polymer body, deep purple AmyAI baseball cap with headphones, large glossy purple eyes, gentle neon purple halo, friendly premium mascot — never a new robot design.";
  const amyGirl =
    "Official Amy Girl character ONLY: brown side ponytail with bright yellow bow, plain purple hoodie without logos, dark purple leggings, purple sneakers with white soles, large warm brown eyes, Pixar-quality 3D child — never redesigned.";

  const characterLine = input.character === "amy-ai" ? amyAi : amyGirl;
  const performance =
    input.performance === "wave" || input.performance === "invite-download"
      ? "Character mid-performance waving one hand toward camera, welcoming smile, body slightly turned, presenting."
      : input.performance === "point"
        ? "Character pointing gently toward a soft glowing learning cue in midground, guiding attention."
        : input.performance === "welcome"
          ? "Character welcoming parents with open friendly pose, looking at camera, presenter energy."
          : "Character alive in the scene with natural micro-pose, never stiff cutout.";

  return [
    env,
    characterLine,
    performance,
    "Character stands in the midground of the designed environment — integrated with contact shadow and matching light direction.",
    "Never a floating sticker, never a transparent PNG overlay look, never a slideshow plate.",
    "Camera-ready vertical advertisement frame with premium depth and cinematic lighting.",
  ].join(" ");
}
