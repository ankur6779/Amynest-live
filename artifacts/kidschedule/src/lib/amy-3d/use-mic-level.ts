// useMicLevelRef — consume the engine's microphone input level (0..1) without
// re-rendering. The Speech Coach mic engine (microphone-session-manager) owns
// the stream + analyser; we only subscribe to its level signal and write it
// into a ref so an animation loop can read it at 60fps.
//
// Returns 0 whenever the mic is inactive or when the active path is the native
// Web Speech API (no accessible stream) — callers should treat 0 as "no signal"
// and fall back to a synthetic cue.

import { useEffect, useRef, type RefObject } from "react";
import { microphoneSessionManager } from "@/lib/microphone-session-manager";

export function useMicLevelRef(active: boolean): RefObject<number> {
  const ref = useRef(0);
  useEffect(() => {
    if (!active) {
      ref.current = 0;
      return;
    }
    const unsub = microphoneSessionManager.subscribeMicLevel((level) => {
      ref.current = level;
    });
    return () => {
      unsub();
      ref.current = 0;
    };
  }, [active]);
  return ref;
}
