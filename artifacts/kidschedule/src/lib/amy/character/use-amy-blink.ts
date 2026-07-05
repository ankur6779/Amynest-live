import { useEffect, useRef, useState } from "react";
import type { AmyMouthFrame } from "@/lib/amy-3d/amy-mouth-audio";
import {
  AMY_BLINK_CLOSE_MS,
  AMY_BLINK_DOUBLE_CLOSE_MS,
  AMY_BLINK_DOUBLE_GAP_MS,
} from "./amy-character-constants";
import { blinkSchedule, shouldSuppressBlinkForMouth } from "./amy-blink-schedule";
import type { AmyCharacterState } from "./amy-character-state";

/**
 * Natural blink scheduler with double-blink support.
 * Pauses during wide-open talking frames when {@link mouthFrameRef} is 2.
 */
export function useAmyBlink(
  characterState: AmyCharacterState,
  reduced: boolean,
  talking: boolean,
  mouthFrameRef: React.RefObject<AmyMouthFrame>,
): boolean {
  const [blinking, setBlinking] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      setBlinking(false);
      return;
    }

    const { minMs, maxMs, doubleChance } = blinkSchedule(characterState);
    let timer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    let doubleTimer: ReturnType<typeof setTimeout>;
    let doubleOpenTimer: ReturnType<typeof setTimeout>;

    const run = () => {
      if (!mountedRef.current) return;
      if (shouldSuppressBlinkForMouth(mouthFrameRef.current ?? 0, talking)) {
        timer = setTimeout(run, 400);
        return;
      }
      setBlinking(true);
      openTimer = setTimeout(() => {
        if (mountedRef.current) setBlinking(false);
      }, AMY_BLINK_CLOSE_MS);
      if (Math.random() < doubleChance) {
        doubleTimer = setTimeout(() => {
          if (!mountedRef.current) return;
          setBlinking(true);
          doubleOpenTimer = setTimeout(() => {
            if (mountedRef.current) setBlinking(false);
          }, AMY_BLINK_DOUBLE_CLOSE_MS);
        }, AMY_BLINK_DOUBLE_GAP_MS);
      }
      timer = setTimeout(run, minMs + Math.random() * (maxMs - minMs));
    };

    timer = setTimeout(run, 900 + Math.random() * 1400);
    return () => {
      clearTimeout(timer);
      clearTimeout(openTimer);
      clearTimeout(doubleTimer);
      clearTimeout(doubleOpenTimer);
    };
  }, [reduced, characterState, talking, mouthFrameRef]);

  return blinking;
}
