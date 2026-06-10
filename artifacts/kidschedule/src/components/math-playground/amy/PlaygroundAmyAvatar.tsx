import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AmyAvatar } from "@/components/amy-3d/amy-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import type { AmyPresenceOutput } from "@workspace/math-playground-engagement";
import { AmyReactionOverlay } from "./AmyReactionOverlay";

interface PlaygroundAmyAvatarProps {
  messageKey: string;
  messageVars?: Record<string, string | number>;
  muted: boolean;
  onToggleMute: () => void;
  amy3dState: Amy3DState;
  presence: AmyPresenceOutput;
  reactionKey: number;
  accentColor?: string;
}

export function PlaygroundAmyAvatar({
  messageKey,
  messageVars,
  muted,
  onToggleMute,
  amy3dState,
  presence,
  reactionKey,
  accentColor,
}: PlaygroundAmyAvatarProps) {
  const { t } = useTranslation();
  const message = t(`components.math_playground.${messageKey}`, messageVars ?? {});

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-3 py-2.5 mb-3 relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
        <AmyAvatar tier="hero" state={amy3dState} size={52} bounce={presence.idleLoop} ring />
        <AmyReactionOverlay
          reaction={presence.reaction}
          reactionKey={reactionKey}
          accentColor={accentColor}
        />
      </div>
      <p className="flex-1 text-sm font-bold text-white/90 leading-snug pt-1">{message}</p>
      <button
        type="button"
        onClick={onToggleMute}
        className="shrink-0 p-2 rounded-xl transition-all active:scale-95"
        style={{ background: "rgba(255,255,255,0.08)" }}
        aria-label={
          muted ? t("components.math_animation.voice_off") : t("components.math_animation.voice_on")
        }
      >
        {muted ? (
          <VolumeX className="h-4 w-4 text-white/50" />
        ) : (
          <Volume2 className="h-4 w-4 text-amber-300" />
        )}
      </button>
    </div>
  );
}
