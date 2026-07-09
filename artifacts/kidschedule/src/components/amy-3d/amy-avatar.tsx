// AmyAvatar — tier-aware entry point for rendering Amy.
//
//   tier="hero"  → Amy3DAvatar (Tripo GLB + 2D fallback)
//   tier="icon"  → lightweight AmyIcon. Never mounts WebGL.

import { type RefObject } from "react";
import { Amy3DAvatar } from "@/components/amy-3d/amy-3d-avatar";
import { AmyIcon } from "@/components/amy-icon";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

export interface AmyAvatarProps {
  state?: Amy3DState;
  size: number;
  tier?: "hero" | "icon";
  modelUrl?: string;
  ring?: boolean;
  bounce?: boolean;
  className?: string;
  audioLevelRef?: RefObject<number>;
  speaking?: boolean;
  /**
   * Hero framing — match Speech Coach (`AmyTalkingHead`) so the Tripo head
   * stays inside the canvas (default 0 clips the cap/headphones at the top).
   */
  modelScale?: number;
  verticalOffset?: number;
}

/** Same defaults as AmyTalkingHead / Speech Coach hero. */
export const AMY_HERO_MODEL_SCALE = 1;
export const AMY_HERO_VERTICAL_OFFSET = -0.8;

export function AmyAvatar({
  state = "idle",
  size,
  tier = "icon",
  modelUrl,
  ring = false,
  bounce = false,
  className,
  audioLevelRef,
  speaking = false,
  modelScale = AMY_HERO_MODEL_SCALE,
  verticalOffset = AMY_HERO_VERTICAL_OFFSET,
}: AmyAvatarProps) {
  const iconFallback = (
    <AmyIcon size={size} ring={ring} bounce={bounce} className={className} speaking={speaking} />
  );

  if (tier !== "hero") {
    return iconFallback;
  }

  return (
    <Amy3DAvatar
      state={state}
      size={size}
      speaking={speaking || state === "speaking"}
      listening={state === "listening"}
      listenForAudio={speaking || state === "speaking"}
      audioLevelRef={audioLevelRef}
      modelUrl={modelUrl}
      className={className}
      showWaveform={false}
      modelScale={modelScale}
      verticalOffset={verticalOffset}
    />
  );
}

export default AmyAvatar;
