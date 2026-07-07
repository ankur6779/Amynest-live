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

  it("fully drops the Head rotation in ambient clips so Amy holds dead-front eye contact", () => {
    const clip = new AnimationClip("wave", 1, [
      new QuaternionKeyframeTrack("Head.quaternion", [0, 0.5, 1], [
        0, 0, 0, 1,
        ...bigTurnQuat,
        0, 0, 0, 1,
      ]),
      new QuaternionKeyframeTrack("L_Upperarm.quaternion", [0], bigTurnQuat),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    const names = sanitized.tracks.map((t) => t.name);
    expect(names).toEqual(["L_Upperarm.quaternion"]);
  });

  it("drops root+torso in the talk clip, keeps arms + a clamped animated head (singing while facing camera)", () => {
    const clip = new AnimationClip("talk", 1, [
      new QuaternionKeyframeTrack("Spine01.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("Waist.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("Head.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("L_Upperarm.quaternion", [0], bigTurnQuat),
      new QuaternionKeyframeTrack("Root.quaternion", [0], bigTurnQuat),
    ]);
    const sanitized = sanitizeAmyGltfClip(clip);
    const byName = Object.fromEntries(sanitized.tracks.map((t) => [t.name, t]));
    // Root + compounding torso chain dropped (no forward hunch / no turn).
    expect(byName["Root.quaternion"]).toBeUndefined();
    expect(byName["Spine01.quaternion"]).toBeUndefined();
    expect(byName["Waist.quaternion"]).toBeUndefined();
    // Head retained but yaw-free + clamped small (bob/nod, not a turn/bend).
    const head = byName["Head.quaternion"]!;
    expect(head).toBeDefined();
    expect(
      quatAngleDeg(...(Array.from(head.values) as [number, number, number, number])),
    ).toBeLessThanOrEqual(14.01);
    // Arm gesture preserved at full amplitude (the singing gesture).
    expect(
      quatAngleDeg(
        ...(Array.from(byName["L_Upperarm.quaternion"]!.values) as [
          number,
          number,
          number,
          number,
        ]),
      ),
    ).toBeGreaterThan(80);
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
