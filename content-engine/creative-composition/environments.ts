/**
 * Environment + character plate prompts for Imagen.
 * Characters are generated inside designed worlds — never pasted as fullscreen PNGs.
 * Cinematic Realism: believable home spaces over fantasy overload.
 */

import type { EnvironmentId, ShotRole } from "./types.js";

const ENV_LOOK: Record<EnvironmentId, string> = {
  "kitchen-table":
    "simple warm Indian family kitchen table, a few worksheets, soft window light, shallow depth of field — real home, uncluttered",
  "child-bedroom":
    "quiet child's bedroom reading corner, tidy bed, soft morning light, calm lavender accents — real home, no busy props",
  "study-desk":
    "simple child study desk with notebook and pencil, soft daylight from a real window, warm wood tones — classroom-at-home calm",
  "living-room":
    "simple cozy living room with sofa, soft practical lamp light, clean family space — lived-in, not busy",
  playroom:
    "bright park-adjacent play corner or simple playroom, soft toys blurred far back, cheerful daylight — calm discovery, no clutter chaos",
  "magic-learning-world":
    "simple classroom reading nook with soft daylight and one quiet book accent — grounded real space, never busy magical overload",
  "cta-stage":
    "clean premium purple gradient hold with soft light, deep #461EA8 to #6A2CFF, empty negative space for CTA — no busy stage dressing",
};

export function environmentPrompt(env: EnvironmentId): string {
  return [
    "Vertical 9:16 cinematic still, 1080x1920 framing.",
    ENV_LOOK[env],
    "Foreground, midground, and background layers clearly separated.",
    "Pixar / DreamWorks-TV family short look — filmed depth, not flat AI plate.",
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
      "Emotional parenting moment suitable for a cold-open animated short.",
      "A parent looking at unfinished worksheets while a child looks stuck nearby.",
      "Faces warm and natural, no horror, no distress exaggeration.",
    ].join(" ");
  }

  const amyAi =
    "Official Amy AI character ONLY: floating rounded white soft-polymer body, deep purple AmyAI baseball cap with headphones, large glossy purple eyes, gentle neon purple halo, friendly premium mentor mascot at child height — never a new robot design, never announcer sticker.";
  const amyGirl =
    "Official Amy Girl character ONLY: brown side ponytail with bright yellow bow, plain purple hoodie without logos, dark purple leggings, purple sneakers with white soles, large warm brown eyes, Pixar-quality 3D child with real-child micro-expression — never redesigned, never generic AI cartoon.";

  const characterLine = input.character === "amy-ai" ? amyAi : amyGirl;
  const performance =
    input.performance === "wave" || input.performance === "invite-download"
      ? "Character mid-performance waving one hand toward camera, welcoming mentor smile, body slightly turned, inviting — not hard-sell."
      : input.performance === "point"
        ? "Character pointing gently toward a soft learning cue in midground, guiding attention like a supportive tutor."
        : input.performance === "welcome"
          ? "Character welcoming parents with open friendly mentor pose, looking at camera, guide energy inside the story."
          : "Character alive in the scene with natural micro-pose, breathing, blinks — never stiff cutout.";

  return [
    env,
    characterLine,
    performance,
    "Character stands in the midground of the designed environment — integrated with contact shadow and matching light direction.",
    "Never a floating sticker, never a transparent PNG overlay look, never a slideshow plate.",
    "Camera-ready vertical short-film frame with premium depth and cinematic lighting.",
  ].join(" ");
}
