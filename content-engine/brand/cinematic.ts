import { AMYNEST_BRAND_COLORS } from "./identity.js";

/** Studio-grade cinematic defaults for every AmyNest Short. */
export const AMYNEST_CINEMATIC_RULES = Object.freeze({
  qualityBar: "Pixar-inspired family animation quality",
  lighting: "Warm cinematic global illumination with soft bloom and gentle fill",
  composition: "Premium vertical 9:16 subject-centered framing with safe caption margins",
  depthOfField: "Soft shallow depth of field, premium bokeh, no harsh edge clipping",
  camera: {
    default: "Gentle cinematic dolly / subtle parallax",
    allowed: ["Static", "Zoom In", "Push", "Pan Left", "Pan Right", "Hold"] as const,
    forbidden: ["shaky cam", "whip pan", "dutch angle extreme", "jump scare cuts"],
  },
  palette: Object.freeze({ ...AMYNEST_BRAND_COLORS }),
  motion: "Natural micro-expressions, soft body language, no morphing artifacts",
  transitions: ["Fade", "Crossfade", "soft-glow", "purple-light-sweep"] as const,
  negativeVisual: [
    "generic stock AI look",
    "random unrelated mascots",
    "harsh neon cyberpunk",
    "horror lighting",
    "low-res artifacts",
    "textured furry redesign of Amy AI",
    "logo recreation / warped brand marks",
  ] as const,
});

export function buildCinematicPromptBlock(): string {
  const c = AMYNEST_CINEMATIC_RULES;
  return [
    `Quality: ${c.qualityBar}.`,
    `Lighting: ${c.lighting}.`,
    `Composition: ${c.composition}.`,
    `DOF: ${c.depthOfField}.`,
    `Camera: ${c.camera.default}.`,
    `Motion: ${c.motion}.`,
    `Palette: primary ${c.palette.primary}, deep ${c.palette.deepPurple}, gold ${c.palette.secondary}.`,
    `Avoid: ${c.negativeVisual.join("; ")}.`,
  ].join("\n");
}
