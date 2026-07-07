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

  /** A ~90° turn around an arbitrary axis, as seen in imported "wave"/"talk" clips. */
  const bigTurnQuat: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5];

  it("clamps large Head rotation so Amy never turns into side profile", () => {
    const clip = new AnimationClip("wave", 1, [
      new QuaternionKeyframeTrack("Head.quaternion", [0, 0.5, 1], [
        0, 0, 0, 1,
        ...bigTurnQuat,
        0, 0, 0, 1,
      ]),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    const track = sanitized.tracks[0]!;
    const midAngle = quatAngleDeg(track.values[4], track.values[5], track.values[6], track.values[7]);
    expect(midAngle).toBeLessThanOrEqual(12.01);
  });

  it("clamps Neck and Spine rotation but leaves arm gestures untouched", () => {
    const clip = new AnimationClip("wave", 1, [
      new QuaternionKeyframeTrack("NeckTwist01.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("Spine02.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("L_Upperarm.quaternion", [0], bigTurnQuat),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    const byName = Object.fromEntries(sanitized.tracks.map((t) => [t.name, t]));

    const neckAngle = quatAngleDeg(...(Array.from(byName["NeckTwist01.quaternion"]!.values) as [number, number, number, number]));
    const spineAngle = quatAngleDeg(...(Array.from(byName["Spine02.quaternion"]!.values) as [number, number, number, number]));
    const armAngle = quatAngleDeg(...(Array.from(byName["L_Upperarm.quaternion"]!.values) as [number, number, number, number]));

    expect(neckAngle).toBeLessThanOrEqual(10.01);
    expect(spineAngle).toBeLessThanOrEqual(7.01);
    expect(armAngle).toBeGreaterThan(80); // arm gestures preserved at full amplitude
  });

  it("leaves rest-pose bones (Waist) untouched even though their baked value is far from identity", () => {
    const clip = new AnimationClip("idle", 1, [
      new QuaternionKeyframeTrack("Waist.quaternion", [0], bigTurnQuat),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    expect(Array.from(sanitized.tracks[0]!.values)).toEqual(bigTurnQuat);
  });
});
