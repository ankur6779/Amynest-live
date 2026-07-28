/**
 * Reusable motion presets for AmyNest Shorts.
 */

import type { MotionPreset, StudioTopicIdea } from "../types.js";

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: "camera-zoom",
    label: "Camera Zoom",
    camera: "Slow push-in on subject eyes / product UI",
    transition: "ease-in-out 1.2s",
  },
  {
    id: "camera-push",
    label: "Push",
    camera: "Forward push into scene for hook impact",
    transition: "ease-out 0.8s",
  },
  {
    id: "camera-orbit",
    label: "Orbit",
    camera: "Gentle 15° orbital around Amy character",
    transition: "linear 2.5s",
  },
  {
    id: "parallax",
    label: "Parallax",
    camera: "Foreground / mid / background depth layers",
    transition: "ease-in-out 2s",
  },
  {
    id: "reveal",
    label: "Reveal",
    camera: "Wipe / light-ray reveal of AmyNest feature UI",
    transition: "ease-out 1s",
    glow: true,
  },
  {
    id: "logo-animation",
    label: "Logo Animation",
    camera: "Centered logo settle with soft scale",
    transition: "spring 0.9s",
    glow: true,
  },
  {
    id: "purple-glow",
    label: "Purple Glow",
    camera: "Static hero with brand purple bloom accents",
    transition: "pulse 1.5s",
    glow: true,
  },
  {
    id: "end-card",
    label: "End Card",
    camera: "Hold branded end card; badges + download line",
    transition: "fade-in 0.4s then hold",
    glow: true,
  },
];

export function selectMotionPresets(idea: StudioTopicIdea): MotionPreset[] {
  const byId = new Map(MOTION_PRESETS.map((p) => [p.id, p]));
  const selected: MotionPreset[] = [
    byId.get("camera-push")!,
    byId.get("reveal")!,
    byId.get("purple-glow")!,
    byId.get("end-card")!,
  ];

  if (/Astro/i.test(idea.category)) {
    selected.splice(1, 0, byId.get("camera-orbit")!);
  } else if (/Games|Creativity/i.test(idea.category)) {
    selected.splice(1, 0, byId.get("parallax")!);
  } else {
    selected.splice(1, 0, byId.get("camera-zoom")!);
  }

  selected.push(byId.get("logo-animation")!);
  return dedupe(selected);
}

function dedupe(presets: MotionPreset[]): MotionPreset[] {
  const seen = new Set<string>();
  return presets.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function formatMotionForPrompt(presets: MotionPreset[]): string {
  return [
    "MOTION PRESETS:",
    ...presets.map((p) => `- ${p.label}: ${p.camera} (${p.transition})${p.glow ? " [purple glow]" : ""}`),
  ].join("\n");
}
