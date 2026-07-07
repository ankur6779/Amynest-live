import { describe, expect, it } from "vitest";
import {
  AMY_GLTF_CLIP,
  AMY_GLTF_CLIP_FOR_STATE,
  AMY_GLTF_FACING_Y,
  AMY_GLTF_LOOPING_CLIPS,
} from "./amy-gltf-clips";

describe("amy-gltf-clips", () => {
  it("maps every Amy3DState to a semantic clip", () => {
    const states = [
      "idle",
      "listening",
      "thinking",
      "speaking",
      "celebrating",
      "encouraging",
    ] as const;
    for (const state of states) {
      expect(AMY_GLTF_CLIP_FOR_STATE[state]).toBeTruthy();
    }
  });

  it("faces Tripo rig toward the default camera (front-facing, never a side profile)", () => {
    expect(AMY_GLTF_FACING_Y).toBeCloseTo(-0.95);
  });

  it("loops ambient states and one-shots celebrate and wave", () => {
    expect(AMY_GLTF_LOOPING_CLIPS.has(AMY_GLTF_CLIP.idle)).toBe(true);
    expect(AMY_GLTF_LOOPING_CLIPS.has(AMY_GLTF_CLIP.talk)).toBe(true);
    expect(AMY_GLTF_LOOPING_CLIPS.has(AMY_GLTF_CLIP.warmup)).toBe(true);
    expect(AMY_GLTF_LOOPING_CLIPS.has(AMY_GLTF_CLIP.celebrate)).toBe(false);
    expect(AMY_GLTF_LOOPING_CLIPS.has(AMY_GLTF_CLIP.wave)).toBe(false);
  });
});
