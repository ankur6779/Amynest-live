import { describe, expect, it } from "vitest";
import { AnimationClip, QuaternionKeyframeTrack } from "three";
import {
  isBlockedAmyRootRotationTrack,
  sanitizeAmyGltfClip,
} from "./sanitize-amy-gltf-clips";

describe("sanitize-amy-gltf-clips", () => {
  it("blocks root and hip rotation tracks", () => {
    expect(isBlockedAmyRootRotationTrack({ name: "Root.quaternion" } as never)).toBe(true);
    expect(isBlockedAmyRootRotationTrack({ name: "Hip.rotation" } as never)).toBe(true);
    expect(isBlockedAmyRootRotationTrack({ name: "Pelvis.quaternion" } as never)).toBe(true);
  });

  it("keeps arm and head tracks", () => {
    expect(isBlockedAmyRootRotationTrack({ name: "L_UpperArm.quaternion" } as never)).toBe(
      false,
    );
    expect(isBlockedAmyRootRotationTrack({ name: "Head.position" } as never)).toBe(false);
  });

  it("removes blocked tracks from clip clones", () => {
    const clip = new AnimationClip("warmup", 2, [
      new QuaternionKeyframeTrack("Root.quaternion", [0], [0, 0, 0, 1]),
      new QuaternionKeyframeTrack("L_UpperArm.quaternion", [0], [0, 0, 0, 1]),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    expect(sanitized.tracks).toHaveLength(1);
    expect(sanitized.tracks[0]?.name).toBe("L_UpperArm.quaternion");
  });
});
