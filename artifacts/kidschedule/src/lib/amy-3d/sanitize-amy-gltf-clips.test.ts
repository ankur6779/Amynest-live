import { describe, expect, it } from "vitest";
import { AnimationClip, QuaternionKeyframeTrack } from "three";
import {
  isBlockedAmyRootRotationTrack,
  removeYawTwistFromQuaternionTrack,
  sanitizeAmyGltfClip,
} from "./sanitize-amy-gltf-clips";

describe("sanitize-amy-gltf-clips", () => {
  it("blocks root and hip rotation tracks", () => {
    expect(isBlockedAmyRootRotationTrack({ name: "Root.quaternion" } as never)).toBe(true);
    expect(isBlockedAmyRootRotationTrack({ name: "Hip.rotation" } as never)).toBe(true);
    expect(isBlockedAmyRootRotationTrack({ name: "Pelvis.quaternion" } as never)).toBe(true);
  });

  it("keeps arm and head tracks out of the root-block filter", () => {
    expect(isBlockedAmyRootRotationTrack({ name: "L_Upperarm.quaternion" } as never)).toBe(
      false,
    );
    expect(isBlockedAmyRootRotationTrack({ name: "Head.quaternion" } as never)).toBe(false);
  });

  function quatAngleDeg(x: number, y: number, z: number, w: number): number {
    if (w < 0) {
      x = -x;
      y = -y;
      z = -z;
      w = -w;
    }
    const axisLen = Math.sqrt(x * x + y * y + z * z);
    return (2 * Math.atan2(axisLen, w) * 180) / Math.PI;
  }

  /** A ~120° turn around an arbitrary axis, as seen in imported "wave"/"talk" clips. */
  const bigTurnQuat: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5];

  it("drops root/hip and the whole torso chain, keeps arm gestures", () => {
    const clip = new AnimationClip("warmup", 2, [
      new QuaternionKeyframeTrack("Root.quaternion", [0], [0, 0, 0, 1]),
      new QuaternionKeyframeTrack("Hip.quaternion", [0], [0, 0, 0, 1]),
      new QuaternionKeyframeTrack("Spine01.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("Spine02.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("NeckTwist01.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("Waist.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("L_Upperarm.quaternion", [0], bigTurnQuat),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    const names = sanitized.tracks.map((t) => t.name);
    expect(names).toEqual(["L_Upperarm.quaternion"]);
    // arm gesture preserved at full amplitude
    expect(
      quatAngleDeg(
        ...(Array.from(sanitized.tracks[0]!.values) as [number, number, number, number]),
      ),
    ).toBeGreaterThan(80);
  });

  it("keeps a small, clamped Head nod so Amy stays attentive but upright", () => {
    const clip = new AnimationClip("wave", 1, [
      new QuaternionKeyframeTrack("Head.quaternion", [0, 0.5, 1], [
        0, 0, 0, 1,
        ...bigTurnQuat,
        0, 0, 0, 1,
      ]),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    const track = sanitized.tracks[0]!;
    expect(track.name).toBe("Head.quaternion");
    const midAngle = quatAngleDeg(
      track.values[4],
      track.values[5],
      track.values[6],
      track.values[7],
    );
    expect(midAngle).toBeLessThanOrEqual(9.01);
  });

  describe("removeYawTwistFromQuaternionTrack", () => {
    it("removes a pure Y-axis (yaw) rotation entirely", () => {
      const yaw = Math.PI / 4; // 45deg left/right turn
      const q: [number, number, number, number] = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
      const out = removeYawTwistFromQuaternionTrack(
        new QuaternionKeyframeTrack("Head.quaternion", [0], q),
      );
      expect(quatAngleDeg(...(Array.from(out.values) as [number, number, number, number]))).toBeLessThan(
        0.01,
      );
    });

    it("preserves a pure X-axis (pitch/nod) rotation", () => {
      const pitch = Math.PI / 6; // 30deg nod
      const q: [number, number, number, number] = [Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)];
      const out = removeYawTwistFromQuaternionTrack(
        new QuaternionKeyframeTrack("Head.quaternion", [0], q),
      );
      expect(
        quatAngleDeg(...(Array.from(out.values) as [number, number, number, number])),
      ).toBeCloseTo(30, 1);
    });
  });
});
