// AmyTalkingHead — delegates to AmyStageAvatar (full-body stage + waveform).
// Preserves the public API used by Speech Coach V2 realtime UI.

import { type RefObject } from "react";
import { AmyStageAvatar } from "@/components/amy/amy-stage-avatar";
import { squareSizeToStageHeight } from "@/lib/amy/use-amy-stage-height";

interface AmyTalkingHeadProps {
  size: number;
  speaking?: boolean;
  listenForAudio?: boolean;
  listening?: boolean;
  audioLevelRef?: RefObject<number>;
  audioMeterActiveRef?: RefObject<boolean>;
  debugMouth?: boolean;
  halo?: boolean;
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
  halo = true,
  className,
}: AmyTalkingHeadProps) {
  const stageState = speaking
    ? "talking"
    : listening
      ? "listening"
      : "idle";

  return (
    <AmyStageAvatar
      state={stageState}
      height={squareSizeToStageHeight(size)}
      speaking={speaking}
      listening={listening}
      listenForAudio={listenForAudio}
      audioLevelRef={audioLevelRef}
      audioMeterActiveRef={audioMeterActiveRef}
      debugMouth={debugMouth}
      showHalo={halo}
      showWaveform
      className={className}
    />
  );
}

export default AmyTalkingHead;
