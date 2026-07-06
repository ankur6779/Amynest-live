import { AnimationClip, type KeyframeTrack } from "three";

/** Bones whose rotation must not turn Amy away from the camera. */
const BLOCKED_ROTATION_TRACK =
  /^(Root|Hip|Pelvis|Armature)\.(rotation|quaternion)$/i;

/**
 * Strip root / hip yaw from imported Tripo clips at runtime (GLB file unchanged).
 * Preserves arms, head, spine, and upper-body gesture tracks.
 */
export function isBlockedAmyRootRotationTrack(track: KeyframeTrack): boolean {
  return BLOCKED_ROTATION_TRACK.test(track.name);
}

export function sanitizeAmyGltfClip(clip: AnimationClip): AnimationClip {
  const tracks = clip.tracks.filter((t) => !isBlockedAmyRootRotationTrack(t));
  return new AnimationClip(clip.name, clip.duration, tracks);
}

export function sanitizeAmyGltfClips(clips: AnimationClip[]): AnimationClip[] {
  return clips.map(sanitizeAmyGltfClip);
}
