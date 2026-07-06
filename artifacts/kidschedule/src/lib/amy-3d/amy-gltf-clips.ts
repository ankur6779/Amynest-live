import type { Amy3DState } from "./use-amy-3d-state";

/** Semantic clip names written by scripts/prepare-amy-gltf.py */
export const AMY_GLTF_CLIP = {
  idle: "idle",
  wave: "wave",
  warmup: "warmup",
  talk: "talk",
  celebrate: "celebrate",
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
  encouraging: AMY_GLTF_CLIP.wave,
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

/** Tripo rig exports profile (+X); rotate to face the default camera on +Z. */
export const AMY_GLTF_FACING_Y = -Math.PI / 2;
