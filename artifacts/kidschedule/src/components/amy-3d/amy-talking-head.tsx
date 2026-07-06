// AmyTalkingHead — Speech Coach hero (Tripo GLB + 2D fallback + mouth frames).

import { type RefObject } from "react";
import { Amy3DAvatar } from "@/components/amy-3d/amy-3d-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

interface AmyTalkingHeadProps {
  size: number;
  speaking?: boolean;
  listenForAudio?: boolean;
  listening?: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
  debugMouth?: boolean;
  halo?: boolean;
  /** Speech Coach before "Start speaking" — continuous warmup loop. */
  waitingForSession?: boolean;
  /** Extra in-canvas scale (default tuned for Speech Coach hero). */
  modelScale?: number;
  /** @deprecated Stage layout is always full-body; circle crop removed. */
  presentation?: "circle" | "stage";
  className?: string;
}

export function AmyTalkingHead({
  size,
  speaking = false,
  listenForAudio = false,
  listening = false,
  audioLevelRef,
  audioMeterActiveRef,
  debugMouth = false,
  halo = false,
  waitingForSession = false,
  modelScale = 1.15,
  className,
}: AmyTalkingHeadProps) {
  const state: Amy3DState = speaking
    ? "speaking"
    : listening
      ? "listening"
      : "idle";

  return (
    <Amy3DAvatar
      state={state}
      size={size}
      speaking={speaking}
      listening={listening}
      listenForAudio={listenForAudio}
      audioLevelRef={audioLevelRef}
      audioMeterActiveRef={audioMeterActiveRef}
      debugMouth={debugMouth}
      showHalo={halo}
      showWaveform
      waitingForSession={waitingForSession}
      modelScale={modelScale}
      className={className}
    />
  );
}

export default AmyTalkingHead;
