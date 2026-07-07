import {
  AnimationClip,
  QuaternionKeyframeTrack,
  type KeyframeTrack,
} from "three";

/** Root-level bones whose rotation must never turn Amy away from the camera. */
const BLOCKED_ROTATION_TRACK =
  /^(Root|Hip|Pelvis|Armature)\.(rotation|quaternion)$/i;

/**
 * Torso chain (spine / waist / neck). Imported Tripo clips swing these bones by
 * 30-45deg on multiple axes, which makes Amy turn to a side profile or bend
 * forward. There is no "gentle" version of these keyframes worth keeping, so we
 * drop their rotation entirely — the bones then rest at their upright, forward
 * bind pose. Liveliness comes from the procedural idle layer (breathing, float,
 * micro-tilt) and from the arm/hand gesture tracks, which are left untouched.
 */
const TORSO_LOCK_CHAIN =
  /^(NeckTwist\d*|Neck|Spine\d*|Chest|UpperChest|Waist|Torso|Bosom)$/i;

/** The head keeps a small, yaw-free nod so Amy still feels attentive. */
const HEAD_BONE = /^Head$/i;
const HEAD_MAX_DEGREES = 9;

function isTorsoLockTrack(track: KeyframeTrack): boolean {
  const [bone, prop] = track.name.split(".");
  if (!bone || (prop !== "quaternion" && prop !== "rotation")) return false;
  return TORSO_LOCK_CHAIN.test(bone);
}

function isHeadTrack(track: KeyframeTrack): boolean {
  const [bone, prop] = track.name.split(".");
  if (!bone || (prop !== "quaternion" && prop !== "rotation")) return false;
  return HEAD_BONE.test(bone);
}

/**
 * Strip root / hip yaw from imported Tripo clips at runtime (GLB file unchanged).
 */
export function isBlockedAmyRootRotationTrack(track: KeyframeTrack): boolean {
  return BLOCKED_ROTATION_TRACK.test(track.name);
}

/**
 * Removes the Y-axis twist (yaw) from every keyframe of a quaternion track via
 * swing-twist decomposition, leaving the swing (pitch + roll) intact. The result
 * is a bone that can still nod and tilt but can no longer turn Amy left/right.
 */
export function removeYawTwistFromQuaternionTrack(
  track: QuaternionKeyframeTrack,
): QuaternionKeyframeTrack {
  const values = track.values.slice();

  for (let i = 0; i + 3 < values.length; i += 4) {
    const x = values[i];
    const y = values[i + 1];
    const z = values[i + 2];
    const w = values[i + 3];

    // Twist about the Y axis is the (0, y, 0, w) component, normalized.
    const mag = Math.hypot(y, w);
    if (mag < 1e-8) {
      // 180deg rotation about an axis in the XZ plane => no yaw to remove.
      continue;
    }
    const ny = y / mag;
    const nw = w / mag;

    // swing = q * inverse(twist), with inverse(twist) = (0, -ny, 0, nw).
    const sx = x * nw + z * ny;
    const sy = -w * ny + y * nw;
    const sz = -x * ny + z * nw;
    const sw = w * nw + y * ny;

    const len = Math.hypot(sx, sy, sz, sw) || 1;
    values[i] = sx / len;
    values[i + 1] = sy / len;
    values[i + 2] = sz / len;
    values[i + 3] = sw / len;
  }

  return new QuaternionKeyframeTrack(
    track.name,
    Array.from(track.times),
    Array.from(values),
  );
}

/**
 * Caps a quaternion's rotation angle away from identity to `maxDeg`, keeping its
 * axis so the residual motion still reads as the same (gentler) gesture.
 */
export function clampQuaternionTrackAngle(
  track: QuaternionKeyframeTrack,
  maxDeg: number,
): QuaternionKeyframeTrack {
  const maxHalfAngle = (maxDeg * Math.PI) / 180 / 2;
  const sinMaxHalf = Math.sin(maxHalfAngle);
  const cosMaxHalf = Math.cos(maxHalfAngle);
  const values = track.values.slice();

  for (let i = 0; i + 3 < values.length; i += 4) {
    let x = values[i];
    let y = values[i + 1];
    let z = values[i + 2];
    let w = values[i + 3];
    if (w < 0) {
      x = -x;
      y = -y;
      z = -z;
      w = -w;
    }
    const axisLen = Math.sqrt(x * x + y * y + z * z);
    if (axisLen < 1e-6) continue;
    const halfAngle = Math.atan2(axisLen, w);
    if (halfAngle <= maxHalfAngle) continue;
    const scale = sinMaxHalf / axisLen;
    values[i] = x * scale;
    values[i + 1] = y * scale;
    values[i + 2] = z * scale;
    values[i + 3] = cosMaxHalf;
  }

  return new QuaternionKeyframeTrack(
    track.name,
    Array.from(track.times),
    Array.from(values),
  );
}

export function sanitizeAmyGltfClip(clip: AnimationClip): AnimationClip {
  const tracks = clip.tracks
    // Drop root/hip and the whole torso chain so Amy stays upright + forward.
    .filter((t) => !isBlockedAmyRootRotationTrack(t) && !isTorsoLockTrack(t))
    .map((t) => {
      if (!isHeadTrack(t) || !(t instanceof QuaternionKeyframeTrack)) return t;
      // Head keeps a small, yaw-free nod so Amy still feels attentive.
      const noYaw = removeYawTwistFromQuaternionTrack(t);
      return clampQuaternionTrackAngle(noYaw, HEAD_MAX_DEGREES);
    });
  return new AnimationClip(clip.name, clip.duration, tracks);
}

export function sanitizeAmyGltfClips(clips: AnimationClip[]): AnimationClip[] {
  return clips.map(sanitizeAmyGltfClip);
}
