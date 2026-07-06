import { useEffect, useRef } from "react";
import type { AnimationAction, AnimationClip } from "three";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import {
  AmyAnimationController,
  applyAmyAnimationState,
  logAmyGltfClipsOnce,
  playSpeechCoachGreeting,
} from "@/lib/amy-3d/amy-animation-controller";

export interface AmyAnimationStateInput {
  actions: Record<string, AnimationAction | null>;
  clips: AnimationClip[];
  state: Amy3DState;
  reduced: boolean;
  /** Speech Coach before "Start speaking" — wave greeting then warmup loop. */
  waitingForSession?: boolean;
}

/** Drives Tripo GLB clips via AmyAnimationController — one mixer, no per-render restarts. */
export function useAmyAnimationState({
  actions,
  clips,
  state,
  reduced,
  waitingForSession = false,
}: AmyAnimationStateInput): boolean {
  const controllerRef = useRef<AmyAnimationController | null>(null);
  const stateRef = useRef(state);
  const prevStateRef = useRef<Amy3DState | null>(null);
  const greetedRef = useRef(false);
  const waitingRef = useRef(waitingForSession);
  stateRef.current = state;
  waitingRef.current = waitingForSession;

  useEffect(() => {
    if (reduced || clips.length === 0) {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      return;
    }

    logAmyGltfClipsOnce(clips);
    const ctrl = new AmyAnimationController(actions, clips);
    controllerRef.current = ctrl;

    if (waitingRef.current && !greetedRef.current) {
      greetedRef.current = true;
      playSpeechCoachGreeting(ctrl, clips);
      prevStateRef.current = stateRef.current;
    } else {
      applyAmyAnimationState({
        controller: ctrl,
        clips,
        state: stateRef.current,
        reduced,
        getState: () => stateRef.current,
        waitingForSession: waitingRef.current,
      });
      prevStateRef.current = stateRef.current;
    }

    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, [actions, clips, reduced]);

  useEffect(() => {
    if (reduced || clips.length === 0 || !controllerRef.current) return;

    const prev = prevStateRef.current;
    if (prev === state) return;
    prevStateRef.current = state;

    applyAmyAnimationState({
      controller: controllerRef.current,
      clips,
      state,
      reduced,
      getState: () => stateRef.current,
      waitingForSession: waitingRef.current,
    });
  }, [clips, reduced, state, waitingForSession]);

  return clips.length > 0 && !reduced;
}
