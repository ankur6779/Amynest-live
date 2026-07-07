import {
  AnimationClip,
  QuaternionKeyframeTrack,
  type KeyframeTrack,
} from "three";

/** Bones whose rotation must not turn Amy away from the camera. */
const BLOCKED_ROTATION_TRACK =
  /^(Root|Hip|Pelvis|Armature)\.(rotation|quaternion)$/i;

/**
 * Bones along the head/neck/spine chain that use an identity bind pose in
 * this rig (their rotation track is a true delta from "facing forward", not
 * a baked rest-pose offset like Waist/Clavicle). Imported Tripo clips (e.g.
 * "wave", "talk", "celebrate") swing these up to 30-45 degrees, which reads
 * as Amy turning into side profile. Clamp — don't remove — so gestures still
 * read as gentle head/upper-body motion instead of a full turn.
 */
const HEAD_CHAIN_MAX_DEGREES: Record<string, number> = {
  head: 12,
  neck: 10,
  spine: 7,
};

function headChainCategory(track: KeyframeTrack): keyof typeof HEAD_CHAIN_MAX_DEGREES | null {
  const [bone, prop] = track.name.split(".");
  if (!bone || (prop !== "quaternion" && prop !== "rotation")) return null;
  if (/^Head$/i.test(bone)) return "head";
  if (/^Neck/i.test(bone)) return "neck";
  if (/^Spine\d*$/i.test(bone)) return "spine";
  return null;
}

/**
 * Strip root / hip yaw from imported Tripo clips at runtime (GLB file unchanged).
 * Preserves arms, head, spine, and upper-body gesture tracks.
 */
export function isBlockedAmyRootRotationTrack(track: KeyframeTrack): boolean {
  return BLOCKED_ROTATION_TRACK.test(track.name);
}

/**
 * Caps a quaternion's rotation angle away from identity to `maxDeg`, keeping
 * its axis so the motion still reads as the same gesture, just gentler.
 * Assumes `values` holds a true delta-from-rest rotation (true for Head /
 * Neck* / Spine* in this rig — verified against the baked GLB clips).
 */
function clampQuaternionTrackAngle(
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
    if (axisLen < 1e-6) continue; // effectively identity, nothing to clamp
    const halfAngle = Math.atan2(axisLen, w);
    if (halfAngle <= maxHalfAngle) continue;
    const scale = sinMaxHalf / axisLen;
    values[i] = x * scale;
    values[i + 1] = y * scale;
    values[i + 2] = z * scale;
    values[i + 3] = cosMaxHalf;
  }

  return new QuaternionKeyframeTrack(track.name, Array.from(track.times), Array.from(values));
}

export function sanitizeAmyGltfClip(clip: AnimationClip): AnimationClip {
  const tracks = clip.tracks
    .filter((t) => !isBlockedAmyRootRotationTrack(t))
    .map((t) => {
      const category = headChainCategory(t);
      if (!category || !(t instanceof QuaternionKeyframeTrack)) return t;
      return clampQuaternionTrackAngle(t, HEAD_CHAIN_MAX_DEGREES[category]);
    });
  return new AnimationClip(clip.name, clip.duration, tracks);
}

export function sanitizeAmyGltfClips(clips: AnimationClip[]): AnimationClip[] {
  return clips.map(sanitizeAmyGltfClip);
}
