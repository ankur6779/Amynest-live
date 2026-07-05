// Drives Tripo / rigged GLB skeletal clips via drei useAnimations.
// Crossfades between semantic clips mapped from Amy3DState.
// Speaking: warmup (once) → talk (loop) on first enter.

import { useEffect, useRef } from "react";
import {
  LoopOnce,
  LoopRepeat,
  type AnimationAction,
  type AnimationClip,
} from "three";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import {
  AMY_GLTF_CLIP,
  AMY_GLTF_CLIP_FOR_STATE,
  AMY_GLTF_LOOPING_CLIPS,
  type AmyGltfClipName,
} from "@/lib/amy-3d/amy-gltf-clips";

const FADE_SEC = 0.35;

export interface AmyGltfActionsInput {
  actions: Record<string, AnimationAction | null>;
  clips: AnimationClip[];
  state: Amy3DState;
  reduced: boolean;
}

function resolveClipName(
  clips: AnimationClip[],
  preferred: AmyGltfClipName,
): string | null {
  const byName = clips.find((c) => c.name === preferred);
  if (byName) return byName.name;
  const semantic = Object.values(AMY_GLTF_CLIP).find((name) =>
    clips.some((c) => c.name === name),
  );
  return semantic ?? clips[0]?.name ?? null;
}

function fadeOutExcept(
  actions: Record<string, AnimationAction | null>,
  keep?: string,
): void {
  for (const [name, action] of Object.entries(actions)) {
    if (name !== keep) action?.fadeOut(FADE_SEC);
  }
}

function playClip(
  actions: Record<string, AnimationAction | null>,
  name: string,
  loop: boolean,
): AnimationAction | null {
  const action = actions[name];
  if (!action) return null;
  action.reset();
  action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.fadeIn(FADE_SEC).play();
  return action;
}

export function useAmyGltfActions({
  actions,
  clips,
  state,
  reduced,
}: AmyGltfActionsInput): boolean {
  const activeRef = useRef<string | null>(null);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevStateRef = useRef<Amy3DState>(state);
  const chainCleanupRef = useRef<(() => void) | null>(null);
  const hasClips = clips.length > 0;

  useEffect(() => {
    chainCleanupRef.current?.();
    chainCleanupRef.current = null;

    if (!hasClips || reduced) {
      for (const action of Object.values(actionsRef.current)) {
        action?.fadeOut(FADE_SEC);
      }
      activeRef.current = null;
      return;
    }

    const prevState = prevStateRef.current;
    prevStateRef.current = state;
    const enteringSpeaking = state === "speaking" && prevState !== "speaking";

    if (state === "speaking") {
      const talkName = resolveClipName(clips, AMY_GLTF_CLIP.talk);
      const warmupName = resolveClipName(clips, AMY_GLTF_CLIP.warmup);
      if (!talkName) return;

      if (
        enteringSpeaking &&
        warmupName &&
        actionsRef.current[warmupName] &&
        actionsRef.current[talkName]
      ) {
        fadeOutExcept(actionsRef.current);
        const warmup = playClip(actionsRef.current, warmupName, false);
        if (!warmup) return;
        activeRef.current = warmupName;

        const mixer = warmup.getMixer();
        const onFinished = (event: { action: AnimationAction }) => {
          if (event.action !== warmup) return;
          if (stateRef.current !== "speaking") return;
          fadeOutExcept(actionsRef.current, talkName);
          playClip(actionsRef.current, talkName, true);
          activeRef.current = talkName;
        };
        mixer.addEventListener("finished", onFinished);
        chainCleanupRef.current = () => {
          mixer.removeEventListener("finished", onFinished);
        };
        return;
      }

      if (activeRef.current === talkName && actionsRef.current[talkName]?.isRunning()) {
        return;
      }

      fadeOutExcept(actionsRef.current, talkName);
      playClip(actionsRef.current, talkName, true);
      activeRef.current = talkName;
      return;
    }

    const targetName = resolveClipName(clips, AMY_GLTF_CLIP_FOR_STATE[state]);
    if (!targetName) return;

    const next = actionsRef.current[targetName];
    if (!next) {
      console.warn("[amy-3d] missing animation clip:", targetName);
      return;
    }

    const prevName = activeRef.current;
    if (prevName === targetName) {
      if (!next.isRunning()) {
        next.reset().fadeIn(FADE_SEC).play();
      }
      return;
    }

    fadeOutExcept(actionsRef.current, targetName);

    const loop = AMY_GLTF_LOOPING_CLIPS.has(targetName as AmyGltfClipName);
    next.reset();
    next.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    if (!loop) next.clampWhenFinished = true;
    next.fadeIn(FADE_SEC).play();
    activeRef.current = targetName;
  }, [clips, hasClips, reduced, state]);

  useEffect(
    () => () => {
      chainCleanupRef.current?.();
    },
    [],
  );

  return hasClips && !reduced;
}
