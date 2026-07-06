import { useEffect, useRef, useState } from "react";
import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";
import { subscribeAmyAnimationClock } from "./amy-animation-clock";
import { resolveAmyMouthFrame, volumeFromLevel } from "./amy-character-motion";

export interface AmyMouthFramesInput {
  speaking: boolean;
  listenForAudio: boolean;
  reduced: boolean;
  tabHidden: boolean;
  audioLevelRef?: React.RefObject<number>;
  audioMeterActiveRef?: React.RefObject<boolean>;
}

/** Audio/timer-driven mouth frame index for 2D talk overlays on 3D body. */
export function useAmyMouthFrames(input: AmyMouthFramesInput): AmyMouthFrame {
  const [frame, setFrame] = useState<AmyMouthFrame>(0);
  const inputRef = useRef(input);
  inputRef.current = input;
  const mouthStateRef = useRef({ lastSpeechAtMs: 0, frame: 0 as AmyMouthFrame });
  const timerFallbackRef = useRef(false);

  useEffect(() => {
    const { speaking, listenForAudio, reduced, audioMeterActiveRef } = input;
    if (!speaking || !listenForAudio || reduced) {
      timerFallbackRef.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      if (audioMeterActiveRef?.current !== true) timerFallbackRef.current = true;
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    return subscribeAmyAnimationClock((nowMs) => {
      const {
        speaking,
        listenForAudio,
        reduced,
        tabHidden,
        audioLevelRef,
        audioMeterActiveRef,
      } = inputRef.current;

      if (reduced || tabHidden || (!speaking && !listenForAudio)) {
        mouthStateRef.current = { lastSpeechAtMs: 0, frame: 0 };
        setFrame(0);
        return;
      }

      const live = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
      const volume = volumeFromLevel(live);
      const meterLive = audioMeterActiveRef?.current === true;
      const useTimerFallback =
        speaking && listenForAudio && !tabHidden && !reduced && timerFallbackRef.current;

      const resolved = resolveAmyMouthFrame({
        nowMs,
        volume,
        meterLive,
        listenForAudio,
        speaking,
        useTimerFallback,
        mouthState: mouthStateRef.current,
      });
      mouthStateRef.current = resolved;
      setFrame(resolved.frame);
    });
  }, []);

  return frame;
}
