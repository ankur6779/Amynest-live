import type { AspectRatio, ResolutionPreset } from "../../types/storyboard.js";

export function parseResolution(resolution: ResolutionPreset): {
  width: number;
  height: number;
} {
  const [width, height] = resolution.split("x").map(Number);
  return {
    width: width || 1080,
    height: height || 1920,
  };
}

export function resolutionForAspect(aspectRatio: AspectRatio): ResolutionPreset {
  switch (aspectRatio) {
    case "16:9":
      return "1920x1080";
    case "1:1":
      return "1080x1080";
    default:
      return "1080x1920";
  }
}

export function matchesAspectRatio(
  width: number,
  height: number,
  aspectRatio: AspectRatio,
  tolerance = 0.05,
): boolean {
  if (width <= 0 || height <= 0) return false;
  const actual = width / height;
  const expected =
    aspectRatio === "9:16" ? 9 / 16 : aspectRatio === "16:9" ? 16 / 9 : 1;
  return Math.abs(actual - expected) <= tolerance;
}
