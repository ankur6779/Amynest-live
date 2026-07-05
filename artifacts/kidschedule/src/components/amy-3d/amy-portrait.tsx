// AmyPortrait — delegates to the shared full-body AmyStageAvatar.
// Kept for backwards compatibility with existing AmyAvatar hero tier imports.

import { type RefObject } from "react";
import { AmyStageAvatar } from "@/components/amy/amy-stage-avatar";
import { squareSizeToStageHeight } from "@/lib/amy/use-amy-stage-height";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

export interface AmyPortraitProps {
  state?: Amy3DState;
  size: number;
  className?: string;
  audioLevelRef?: RefObject<number>;
  speaking?: boolean;
}

export function AmyPortrait({
  state = "idle",
  size,
  className,
  audioLevelRef,
  speaking = false,
}: AmyPortraitProps) {
  return (
    <AmyStageAvatar
      state={state}
      height={squareSizeToStageHeight(size)}
      speaking={speaking || state === "speaking"}
      listening={state === "listening"}
      listenForAudio={speaking || state === "speaking"}
      audioLevelRef={audioLevelRef}
      className={className}
      showWaveform={false}
    />
  );
}

export default AmyPortrait;
