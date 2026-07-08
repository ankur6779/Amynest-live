import type { Amy3DState } from "./use-amy-3d-state";

/** Semantic clip names written by scripts/prepare-amy-gltf.py */
export const AMY_GLTF_CLIP = {
  idle: "idle",
  wave: "wave",
  warmup: "warmup",
  talk: "talk",
  celebrate: "celebrate",
  cheer: "cheer",
  listening: "listening",
  thinking: "thinking",
} as const;

export type AmyGltfClipName = (typeof AMY_GLTF_CLIP)[keyof typeof AMY_GLTF_CLIP];

/** Primary clip per avatar state (Tripo rig — see prepare-amy-gltf.py). */
export const AMY_GLTF_CLIP_FOR_STATE: Record<Amy3DState, AmyGltfClipName> = {
  idle: AMY_GLTF_CLIP.idle,
  listening: AMY_GLTF_CLIP.listening,
  thinking: AMY_GLTF_CLIP.thinking,
  speaking: AMY_GLTF_CLIP.talk,
  celebrating: AMY_GLTF_CLIP.celebrate,
  encouraging: AMY_GLTF_CLIP.cheer,
};

/** Clips that should loop while their state is active. */
export const AMY_GLTF_LOOPING_CLIPS = new Set<AmyGltfClipName>([
  AMY_GLTF_CLIP.idle,
  AMY_GLTF_CLIP.warmup,
  AMY_GLTF_CLIP.listening,
  AMY_GLTF_CLIP.thinking,
  AMY_GLTF_CLIP.talk,
]);

/** Crossfade when Speech Coach session starts (warmup → talk). */
export const AMY_SESSION_START_FADE_SEC = 0.3;

/** Default crossfade between ambient states. */
export const AMY_GLTF_FADE_SEC = 0.35;

/**
 * Y rotation (radians) that turns the Tripo rig to face the camera head-on.
 * The rig's bind pose faces +X, so a quarter turn brings it to +Z (camera).
 * Verified against a bind-pose yaw sweep (scripts/amy-clip-viewer.html?rotYs=…):
 * at -PI/2 the cap logo is centered and both eyes/headphones are symmetric —
 * true eye contact. The previous -1.15 left Amy ~24° turned to her left.
 * Torso yaw from imported clips is stripped by sanitizeAmyGltfClips, so this
 * angle alone fully determines her facing.
 */
export const AMY_GLTF_FACING_Y = -Math.PI / 2;
