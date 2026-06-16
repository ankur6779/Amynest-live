import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AMY_PORTRAIT_SRC } from "@/lib/amy-3d/baked-avatar";

interface AmyCompanionBarProps {
  messageKey: string;
  messageVars?: Record<string, string | number>;
  muted: boolean;
  onToggleMute: () => void;
  onPlayMessage?: () => void;
  speaking?: boolean;
}

export function AmyCompanionBar({
  messageKey,
  messageVars,
  muted,
  onToggleMute,
  onPlayMessage,
  speaking,
}: AmyCompanionBarProps) {
  const { t } = useTranslation();
  const message = t(`components.math_playground.${messageKey}`, messageVars ?? {});

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-3 py-2.5 mb-3"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <motion.img
        src={AMY_PORTRAIT_SRC}
        alt="Amy"
        className="h-11 w-11 rounded-xl shrink-0 object-cover"
        animate={speaking ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ repeat: speaking ? Infinity : 0, duration: 0.8 }}
      />
      <p className="flex-1 text-sm font-bold text-white/90 leading-snug pt-1">{message}</p>
      <div className="flex shrink-0 flex-col gap-1">
        {onPlayMessage ? (
          <button
            type="button"
            data-testid="mp-amy-play"
            onClick={onPlayMessage}
            disabled={muted}
            className="p-2 rounded-xl transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.08)" }}
            aria-label={t("components.math_playground.amy_tap_to_hear")}
          >
            <Volume2 className="h-4 w-4 text-amber-300" />
          </button>
        ) : null}
        <button
          type="button"
          data-testid="mp-mute-toggle"
          onClick={onToggleMute}
          className="p-2 rounded-xl transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.08)" }}
          aria-label={muted ? t("components.math_animation.voice_off") : t("components.math_animation.voice_on")}
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-white/50" />
          ) : (
            <Volume2 className="h-4 w-4 text-amber-300" />
          )}
        </button>
      </div>
    </div>
  );
}
