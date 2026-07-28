/**
 * Cinematography guidance for Pixar-inspired AmyNest Shorts.
 */

import type { StudioCategory, StudioTopicIdea } from "../types.js";

export interface CinematicPlan {
  lens: string;
  lighting: string;
  framing: string;
  colorGrade: string;
  notes: string[];
}

export function planCinematography(idea: StudioTopicIdea): CinematicPlan {
  const pillarNotes = pillarLook(idea.category);
  return {
    lens: "35–50mm equivalent intimacy; avoid fisheye distortion",
    lighting: pillarNotes.lighting,
    framing: "9:16 vertical; subject in upper two-thirds; safe margins for captions",
    colorGrade: "Warm skin tones + AmyNest purple accents (#6A2CFF / #461EA8)",
    notes: [
      "Pixar-inspired: clear silhouette, expressive eyes, premium materials — not plastic CGI.",
      "Keep official characters identity-locked; never redesign wardrobe or face.",
      pillarNotes.note,
      "End on branded end card with app icon + store badges.",
    ],
  };
}

function pillarLook(category: StudioCategory): { lighting: string; note: string } {
  if (/Astro/i.test(category)) {
    return {
      lighting: "Soft cosmic twilight with gentle purple nebula — never harsh neon",
      note: "Astro: magical but calm; stars as story helpers, not horror sci-fi.",
    };
  }
  if (/Speech|Learning|Reading|Math|Science/i.test(category)) {
    return {
      lighting: "Bright daylight classroom warmth with soft window key light",
      note: "Learning: crisp readable props; playful without clutter.",
    };
  }
  if (/Health|Nutrition|Routine/i.test(category)) {
    return {
      lighting: "Clean morning light; fresh greens and soft lavenders",
      note: "Health/Routine: reassuring realism with storybook softness.",
    };
  }
  if (/Games|Creativity/i.test(category)) {
    return {
      lighting: "Playful rim light; saturated but tasteful accents",
      note: "Play: motion-forward; keep brand purple as anchor.",
    };
  }
  return {
    lighting: "Soft cinematic key + gentle fill; purple accent rim",
    note: "Parent tip: intimate, premium, emotionally clear.",
  };
}

export function formatCinematographyForPrompt(plan: CinematicPlan): string {
  return [
    "CINEMATOGRAPHY:",
    `Lens: ${plan.lens}`,
    `Lighting: ${plan.lighting}`,
    `Framing: ${plan.framing}`,
    `Grade: ${plan.colorGrade}`,
    ...plan.notes.map((n) => `- ${n}`),
  ].join("\n");
}
