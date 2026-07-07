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

/** Ambient clips fully freeze the head; the talk clip animates it (see below). */
const HEAD_BONE = /^Head$/i;

/**
 * The "talk" clip is the singing/talking animation played ONLY while Amy is
 * speaking. Unlike the ambient clips we don't fully freeze the torso here —
 * instead we strip the yaw (so she never turns side-on) and clamp the remaining
 * swing to a moderate angle, so she visibly sings/sways while staying upright
 * and facing the camera. Larger than the ambient head cap, small enough to never
 * become a side profile or a deep forward bend.
 */
const TALK_CLIP_NAME = /^talk$/i;
const TALK_HEAD_MAX_DEGREES = 14;

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

/**
 * Talk clip (played ONLY while Amy is speaking): this is the "singing" clip.
 *
 * The torso chain is dropped just like the ambient clips — clamping each of the
 * 5-6 spine/neck bones individually is unsafe because their forward pitch
 * COMPOUNDS down the chain and folds Amy into a deep hunch. Instead the singing
 * feel comes from her expressive arm/hand gestures (kept at full amplitude) plus
 * an animated head that bobs/nods — yaw-stripped and clamped so she stays
 * upright and locked onto the camera while she talks.
 */
function sanitizeAmyTalkClip(clip: AnimationClip): AnimationClip {
  const tracks = clip.tracks
    .filter((t) => !isBlockedAmyRootRotationTrack(t) && !isTorsoLockTrack(t))
    .map((t) => {
      if (isHeadTrack(t) && t instanceof QuaternionKeyframeTrack) {
        return clampQuaternionTrackAngle(
          removeYawTwistFromQuaternionTrack(t),
          TALK_HEAD_MAX_DEGREES,
        );
      }
      return t;
    });
  return new AnimationClip(clip.name, clip.duration, tracks);
}

/**
 * Ambient clips (idle / warmup / listening / thinking / wave / celebrate):
 * fully front-locked. Drop root/hip, the whole torso chain AND the head so those
 * bones rest at their upright, forward bind pose — Amy holds dead-on eye contact
 * and never drifts into a turn while she is not speaking. Arm/hand gestures and
 * the procedural idle layer (breathing, float, micro-tilt) keep her alive.
 */
function sanitizeAmyAmbientClip(clip: AnimationClip): AnimationClip {
  const tracks = clip.tracks.filter(
    (t) =>
      !isBlockedAmyRootRotationTrack(t) && !isTorsoLockTrack(t) && !isHeadTrack(t),
  );
  return new AnimationClip(clip.name, clip.duration, tracks);
}

export function sanitizeAmyGltfClip(clip: AnimationClip): AnimationClip {
  return TALK_CLIP_NAME.test(clip.name)
    ? sanitizeAmyTalkClip(clip)
    : sanitizeAmyAmbientClip(clip);
}

export function sanitizeAmyGltfClips(clips: AnimationClip[]): AnimationClip[] {
  return clips.map(sanitizeAmyGltfClip);
}
